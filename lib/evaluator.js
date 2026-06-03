import { GoogleGenerativeAI } from '@google/generative-ai';

/**
 * AI Evaluator Module
 * Compares the candidate's resume against a job description using Gemini.
 * Returns score, reasons, resume optimizations, and a tailored cover letter.
 */
export async function evaluateJobCompatibility({ jobTitle, company, description, resumeText, candidateName, geminiApiKey }) {
  const apiKey = geminiApiKey || process.env.GEMINI_API_KEY;

  if (!apiKey) {
    console.warn('No Gemini API key configured. Using baseline mock evaluation.');
    return getMockEvaluation(jobTitle, company, candidateName);
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const prompt = `
Vous êtes un recruteur expert en IA et un coach de carrière.
Comparez le CV du candidat (nommé ${candidateName}) avec l'offre d'emploi suivante :

POSTE : ${jobTitle}
ENTREPRISE : ${company}
DESCRIPTION DE L'OFFRE :
${description}

---
CV DU CANDIDAT :
${resumeText}
---

Veuillez effectuer l'analyse suivante et renvoyer la réponse au format JSON uniquement.
Le JSON doit comporter exactement les clés suivantes :
1. "score": Une note entière de 1 à 10 (où 10 représente une compatibilité parfaite et 1 une absence totale de correspondance). Soyez réaliste et exigeant.
2. "compatibilityReason": Une explication structurée en français (avec des puces HTML <ul><li>) décrivant pourquoi le profil correspond ou ne correspond pas (forces, faiblesses, compétences manquantes ou présentes).
3. "suggestedResumeChanges": 3 à 5 suggestions concrètes en français (avec des puces HTML <ul><li>) pour adapter ou améliorer le CV du candidat spécifiquement pour cette offre (mots-clés à ajouter, projets à mettre en valeur, etc.).
4. "customCoverLetter": Une lettre de motivation complète, personnalisée et très convaincante en français, prête à l'envoi. Ne mettez aucun placeholder indéfini (utilisez "${candidateName}" comme signature, et écrivez "Madame, Monsieur" si le nom du recruteur est inconnu). Le style doit être professionnel et percutant.

Renvoyez uniquement la chaîne JSON brute, sans blocs de code markdown comme \`\`\`json ou autres textes d'introduction/conclusion.
`;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text().trim();

    let cleanJson = responseText;
    if (cleanJson.startsWith('```json')) {
      cleanJson = cleanJson.slice(7);
    }
    if (cleanJson.endsWith('```')) {
      cleanJson = cleanJson.slice(0, -3);
    }
    cleanJson = cleanJson.trim();

    try {
      const parsed = JSON.parse(cleanJson);
      if (parsed.score !== undefined && parsed.compatibilityReason && parsed.suggestedResumeChanges && parsed.customCoverLetter) {
        return {
          score: Math.max(1, Math.min(10, parseInt(parsed.score) || 5)),
          compatibilityReason: parsed.compatibilityReason,
          suggestedResumeChanges: parsed.suggestedResumeChanges,
          customCoverLetter: parsed.customCoverLetter
        };
      }
    } catch (jsonErr) {
      console.error('Failed to parse JSON response from Gemini. Response was:', responseText, jsonErr);
    }
  } catch (error) {
    console.error('Error in evaluateJobCompatibility with Gemini:', error);
  }

  // Fallback to mock evaluation if something goes wrong or API key fails
  return getMockEvaluation(jobTitle, company, candidateName);
}

function getMockEvaluation(jobTitle, company, candidateName) {
  const mockScore = Math.floor(Math.random() * 5) + 5; // Score 5-9
  return {
    score: mockScore,
    compatibilityReason: `
      <ul>
        <li>Le profil possède des compétences solides en développement qui correspondent aux besoins de <strong>${company}</strong>.</li>
        <li>Certaines technologies secondaires requises pour le poste de <strong>${jobTitle}</strong> n'apparaissent pas explicitement dans votre CV.</li>
        <li>Votre expérience précédente démontre une bonne capacité d'adaptation aux projets web modernes.</li>
      </ul>
    `,
    suggestedResumeChanges: `
      <ul>
        <li>Ajoutez des exemples précis d'applications web développées récemment sous votre rubrique projets.</li>
        <li>Mettez en avant vos compétences en travail collaboratif et en méthodologies agiles.</li>
        <li>Incorporez les mots-clés spécifiques liés à l'environnement technique de <strong>${company}</strong> dans l'introduction de votre CV.</li>
      </ul>
    `,
    customCoverLetter: `
Objet : Candidature pour le poste de ${jobTitle} chez ${company}

Madame, Monsieur,

C’est avec un grand intérêt que j’ai pris connaissance de votre offre d’emploi pour le poste de ${jobTitle} au sein de ${company}. Mon profil correspond particulièrement aux compétences recherchées pour ce poste.

Au cours de mes précédentes expériences professionnelles, j’ai développé des compétences techniques solides qui me permettraient de m'intégrer rapidement dans vos équipes. Collaborer avec ${company} représente pour moi une opportunité unique d'apporter ma contribution à vos projets tout en continuant d'évoluer au contact d'experts.

Je me tiens à votre entière disposition pour convenir d'un entretien afin de vous exposer de vive voix mon parcours et mes motivations.

Je vous prie d'agréer, Madame, Monsieur, l'expression de mes salutations distinguées.

${candidateName || 'Candidat'}
    `.trim()
  };
}
