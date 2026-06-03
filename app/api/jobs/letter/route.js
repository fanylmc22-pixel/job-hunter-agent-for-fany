import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { GoogleGenerativeAI } from '@google/generative-ai';

export async function POST(request) {
  try {
    const { jobId } = await request.json();

    if (!jobId) {
      return NextResponse.json({ error: 'ID de l\'offre requis.' }, { status: 400 });
    }

    // Get Job details
    const job = await prisma.job.findUnique({
      where: { id: jobId },
    });

    if (!job) {
      return NextResponse.json({ error: 'Offre d\'emploi introuvable.' }, { status: 404 });
    }

    // Get Profile details
    const profile = await prisma.profile.findUnique({
      where: { id: 'default' },
    });

    if (!profile || !profile.resumeText) {
      return NextResponse.json(
        { error: 'Veuillez d\'abord uploader ou insérer votre CV dans les paramètres.' },
        { status: 400 }
      );
    }

    // Get API Key
    const apiKey = profile.geminiApiKey || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Clé API Gemini manquante. Veuillez la configurer dans l\'onglet Paramètres.' },
        { status: 400 }
      );
    }

    // Initialize Gemini API
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const prompt = `
Vous êtes un assistant expert en recrutement et en rédaction de candidatures.
Rédigez une lettre de motivation (en français) percutante, personnalisée et professionnelle pour l'offre d'emploi suivante :

TITRE DU POSTE: ${job.title}
ENTREPRISE: ${job.company}
DESCRIPTION DE L'OFFRE:
${job.description}

Voici le CV du candidat (nommé ${profile.name}) :
${profile.resumeText}

Consignes importantes pour la rédaction de la lettre :
1. Adoptez un ton professionnel, motivé et engageant.
2. Structurez la lettre de manière standard (En-tête, Objet, Introduction, Corps montrant le lien entre le profil et l'offre, Conclusion avec appel à l'action, Signature).
3. Mettez en avant 2 ou 3 expériences/compétences du CV qui matchent le mieux avec les exigences de l'offre d'emploi.
4. N'utilisez pas de placeholders non remplis (ex: [Date], [Nom du recruteur] si inconnu, écrivez simplement "Madame, Monsieur" si inconnu). Remplissez le nom du candidat par "${profile.name}".
5. Ne soyez pas trop générique. Personnalisez au maximum.

Renvoyez UNIQUEMENT la lettre de motivation sous forme de texte propre (pas de markdown en dehors des retours à la ligne standard).
`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const letterText = response.text();

    // Update job with generated letter
    const updatedJob = await prisma.job.update({
      where: { id: jobId },
      data: {
        customCoverLetter: letterText,
      },
    });

    return NextResponse.json({
      success: true,
      letter: letterText,
      job: updatedJob,
    });
  } catch (error) {
    console.error('Erreur lors de la génération de la lettre:', error);
    return NextResponse.json({ error: 'Erreur lors de la génération de la lettre par Gemini: ' + error.message }, { status: 500 });
  }
}
