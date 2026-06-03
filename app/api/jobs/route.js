import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET() {
  try {
    const jobs = await prisma.job.findMany({
      orderBy: [
        { score: 'desc' },
        { createdAt: 'desc' }
      ]
    });
    return NextResponse.json(jobs);
  } catch (error) {
    console.error('Erreur GET jobs:', error);
    return NextResponse.json({ error: 'Erreur lors de la récupération des offres.' }, { status: 500 });
  }
}

export async function PATCH(request) {
  try {
    const { id, status, customCoverLetter, score, compatibilityReason, suggestedResumeChanges } = await request.json();
    
    if (!id) {
      return NextResponse.json({ error: 'ID requis.' }, { status: 400 });
    }

    const updateData = {};
    if (status !== undefined) updateData.status = status;
    if (customCoverLetter !== undefined) updateData.customCoverLetter = customCoverLetter;
    if (score !== undefined) updateData.score = score;
    if (compatibilityReason !== undefined) updateData.compatibilityReason = compatibilityReason;
    if (suggestedResumeChanges !== undefined) updateData.suggestedResumeChanges = suggestedResumeChanges;

    const updatedJob = await prisma.job.update({
      where: { id },
      data: updateData
    });

    return NextResponse.json({ success: true, job: updatedJob });
  } catch (error) {
    console.error('Erreur PATCH job:', error);
    return NextResponse.json({ error: 'Erreur lors de la mise à jour de l\'offre.' }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID requis.' }, { status: 400 });
    }

    await prisma.job.delete({
      where: { id }
    });

    return NextResponse.json({ success: true, message: 'Offre supprimée avec succès.' });
  } catch (error) {
    console.error('Erreur DELETE job:', error);
    return NextResponse.json({ error: 'Erreur lors de la suppression de l\'offre.' }, { status: 500 });
  }
}
