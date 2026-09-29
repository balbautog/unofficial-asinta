import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { requireFounder } from '@/lib/auth/serverRole';
import {
  DEFAULT_INITIAL_REQUEST_BODY,
  DEFAULT_INITIAL_REQUEST_SUBJECT,
  EDITABLE_TEMPLATE_TYPES,
  IMPORTANT_PLACEHOLDERS,
  SUPPORTED_PLACEHOLDERS,
  validateTemplate,
  type EmailTemplateType,
} from '@/lib/email/templates';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const DEFAULTS: Record<string, { subject: string; body: string }> = {
  initial_request: {
    subject: DEFAULT_INITIAL_REQUEST_SUBJECT,
    body: DEFAULT_INITIAL_REQUEST_BODY,
  },
};

/** Founder-only: fetch the active template for a type (default: initial_request). */
export async function GET(req: NextRequest) {
  const supabase = createServerSupabaseClient();
  const founder = await requireFounder(supabase);
  if (!founder.ok) {
    return NextResponse.json({ error: founder.error }, { status: founder.status });
  }

  const templateType = req.nextUrl.searchParams.get('type') || 'initial_request';
  if (!EDITABLE_TEMPLATE_TYPES.includes(templateType as EmailTemplateType)) {
    return NextResponse.json({ error: 'This template type is not editable yet' }, { status: 400 });
  }

  const { data: row } = await supabase
    .from('email_templates')
    .select('id, template_type, subject_template, body_template, version, active, updated_at')
    .eq('template_type', templateType)
    .maybeSingle();

  const defaults = DEFAULTS[templateType];
  return NextResponse.json({
    template: row || {
      template_type: templateType,
      subject_template: defaults.subject,
      body_template: defaults.body,
      version: 1,
      active: true,
    },
    defaults: { subject_template: defaults.subject, body_template: defaults.body },
    supportedPlaceholders: SUPPORTED_PLACEHOLDERS,
    importantPlaceholders: IMPORTANT_PLACEHOLDERS,
    isSystemDefault:
      !row ||
      (row.subject_template === defaults.subject && row.body_template === defaults.body),
  });
}

/**
 * Founder-only: save a new template version, or restore the system default.
 * Every saved change increments `version`; historical email_logs snapshots
 * are never touched.
 */
export async function PUT(req: NextRequest) {
  try {
    const supabase = createServerSupabaseClient();
    const founder = await requireFounder(supabase);
    if (!founder.ok) {
      return NextResponse.json({ error: founder.error }, { status: founder.status });
    }

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const templateType: string = typeof body.template_type === 'string' ? body.template_type : 'initial_request';
    if (!EDITABLE_TEMPLATE_TYPES.includes(templateType as EmailTemplateType)) {
      return NextResponse.json({ error: 'This template type is not editable yet' }, { status: 400 });
    }

    const defaults = DEFAULTS[templateType];
    const restoreDefault = body.restore_default === true;
    const subjectTemplate: string = restoreDefault
      ? defaults.subject
      : typeof body.subject_template === 'string'
        ? body.subject_template.trim()
        : '';
    const bodyTemplate: string = restoreDefault
      ? defaults.body
      : typeof body.body_template === 'string'
        ? body.body_template.trim()
        : '';

    if (!subjectTemplate || !bodyTemplate) {
      return NextResponse.json({ error: 'Subject and body templates are required' }, { status: 400 });
    }
    if (subjectTemplate.length > 500 || bodyTemplate.length > 10000) {
      return NextResponse.json({ error: 'The template is too long' }, { status: 400 });
    }

    const validation = validateTemplate(subjectTemplate, bodyTemplate);
    if (!validation.valid) {
      return NextResponse.json(
        {
          error: `Unsupported placeholders: ${validation.unknownPlaceholders.join(', ')}`,
          unknownPlaceholders: validation.unknownPlaceholders,
        },
        { status: 422 }
      );
    }

    const { data: existing } = await supabase
      .from('email_templates')
      .select('id, version')
      .eq('template_type', templateType)
      .maybeSingle();

    const nowIso = new Date().toISOString();
    let saved: { version: number } | null = null;

    if (existing) {
      const { data: updated, error: updateError } = await supabase
        .from('email_templates')
        .update({
          subject_template: subjectTemplate,
          body_template: bodyTemplate,
          version: (Number(existing.version) || 1) + 1,
          active: true,
          updated_by: founder.userId,
          updated_at: nowIso,
        })
        .eq('id', existing.id)
        .select('version')
        .single();
      if (updateError) {
        return NextResponse.json({ error: 'Failed to save the template' }, { status: 500 });
      }
      saved = updated;
    } else {
      const { data: inserted, error: insertError } = await supabase
        .from('email_templates')
        .insert({
          template_type: templateType,
          subject_template: subjectTemplate,
          body_template: bodyTemplate,
          version: 1,
          active: true,
          updated_by: founder.userId,
        })
        .select('version')
        .single();
      if (insertError) {
        return NextResponse.json({ error: 'Failed to save the template' }, { status: 500 });
      }
      saved = inserted;
    }

    return NextResponse.json({
      saved: true,
      restored: restoreDefault,
      version: saved?.version ?? 1,
      warnings: validation.missingImportantPlaceholders,
    });
  } catch {
    return NextResponse.json({ error: 'Failed to save the template' }, { status: 500 });
  }
}
