import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { PDFParse } from 'pdf-parse';
import mammoth from 'mammoth';

export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');
    const jobId = formData.get('jobId'); // Optional: if provided, upload CV specific to this job match

    if (!file) {
      return NextResponse.json({ error: 'Aucun fichier téléchargé.' }, { status: 400 });
    }

    const fileName = file.name;
    const buffer = Buffer.from(await file.arrayBuffer());
    const base64Data = buffer.toString('base64');
    let text = '';

    // We only parse the text if it's the main profile upload OR if we want to show preview
    // Word/PDF parser
    if (fileName.endsWith('.pdf')) {
      const parser = new PDFParse({ data: buffer });
      const result = await parser.getText();
      text = result.text;
      await parser.destroy();
    } else if (fileName.endsWith('.docx') || fileName.endsWith('.doc')) {
      const result = await mammoth.extractRawText({ buffer });
      text = result.value;
    } else if (fileName.endsWith('.txt')) {
      text = buffer.toString('utf-8');
    } else {
      return NextResponse.json(
        { error: 'Format de fichier non supporté. Veuillez uploader un PDF, Word ou TXT.' },
        { status: 400 }
      );
    }

    if (jobId) {
      // Upload CV tailored for a specific job application
      const updatedJob = await prisma.job.update({
        where: { id: jobId },
        data: {
          customResumeFileName: fileName,
          customResumeFileBase64: base64Data,
        },
      });
      return NextResponse.json({
        success: true,
        fileName,
        job: updatedJob,
      });
    } else {
      // Main profile CV upload
      const profile = await prisma.profile.upsert({
        where: { id: 'default' },
        update: {
          resumeText: text,
          resumeFileName: fileName,
          resumeFileBase64: base64Data,
        },
        create: {
          id: 'default',
          resumeText: text,
          resumeFileName: fileName,
          resumeFileBase64: base64Data,
          name: 'Candidat',
        },
      });

      return NextResponse.json({
        success: true,
        fileName,
        textLength: text.length,
        profile,
      });
    }
  } catch (error) {
    console.error('Erreur lors du parsing du CV:', error);
    return NextResponse.json({ error: 'Erreur serveur lors du traitement du fichier: ' + error.message }, { status: 500 });
  }
}
