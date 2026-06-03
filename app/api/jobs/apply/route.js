import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import nodemailer from 'nodemailer';

export async function POST(request) {
  try {
    const { jobId, recipientEmail, coverLetterText } = await request.json();

    if (!jobId) {
      return NextResponse.json({ error: 'ID de l\'offre requis.' }, { status: 400 });
    }

    // 1. Fetch Job and Profile details
    const job = await prisma.job.findUnique({
      where: { id: jobId }
    });

    if (!job) {
      return NextResponse.json({ error: 'Offre d\'emploi introuvable.' }, { status: 404 });
    }

    const profile = await prisma.profile.findUnique({
      where: { id: 'default' }
    });

    if (!profile) {
      return NextResponse.json({ error: 'Profil introuvable.' }, { status: 404 });
    }

    // 2. Resolve credentials (DB profile settings fallback to environment variables)
    const gmailUser = profile.gmailUser || process.env.GMAIL_USER;
    const gmailAppPassword = profile.gmailAppPassword || process.env.GMAIL_APP_PASSWORD;

    if (!gmailUser || !gmailAppPassword) {
      return NextResponse.json({
        error: 'Identifiants Gmail SMTP manquants. Veuillez configurer votre adresse Gmail et votre mot de passe d\'application dans l\'onglet Paramètres.'
      }, { status: 400 });
    }

    // 3. Resolve target email (where to send the application)
    // Custom email from body, fallback to profile target email, fallback to gmail user itself (self test)
    const toEmail = recipientEmail || profile.targetEmail || gmailUser;

    if (!toEmail) {
      return NextResponse.json({
        error: 'Adresse email de destination manquante. Veuillez saisir un destinataire ou configurer l\'adresse de test dans les Paramètres.'
      }, { status: 400 });
    }

    // 4. Resolve CV Attachment
    let cvBuffer = null;
    let cvFileName = '';

    // If job has a custom tailored CV, use it. Otherwise, use profile's default CV.
    if (job.customResumeFileBase64 && job.customResumeFileName) {
      cvBuffer = Buffer.from(job.customResumeFileBase64, 'base64');
      cvFileName = job.customResumeFileName;
      console.log(`Using tailored CV for application: ${cvFileName}`);
    } else if (profile.resumeFileBase64 && profile.resumeFileName) {
      cvBuffer = Buffer.from(profile.resumeFileBase64, 'base64');
      cvFileName = profile.resumeFileName;
      console.log(`Using default profile CV for application: ${cvFileName}`);
    }

    // 5. Setup Nodemailer Transporter (Gmail SMTP)
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: gmailUser,
        pass: gmailAppPassword
      }
    });

    // 6. Define Mail options
    const emailBody = coverLetterText || job.customCoverLetter || `Bonjour, veuillez trouver ci-joint ma candidature pour le poste de ${job.title}.`;
    const mailOptions = {
      from: `"${profile.name || 'Job Hunter Agent'}" <${gmailUser}>`,
      to: toEmail,
      subject: `Candidature - ${job.title} - ${profile.name || ''}`,
      text: emailBody,
      attachments: cvBuffer ? [
        {
          filename: cvFileName,
          content: cvBuffer
        }
      ] : []
    };

    // 7. Send Mail
    console.log(`Sending job application email from ${gmailUser} to ${toEmail}...`);
    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent successfully:', info.messageId);

    // 8. Update Job status in Database
    const updatedJob = await prisma.job.update({
      where: { id: jobId },
      data: {
        status: 'APPLIED',
        customCoverLetter: emailBody // save any edits made in UI prior to sending
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Candidature envoyée avec succès par email !',
      messageId: info.messageId,
      job: updatedJob
    });

  } catch (error) {
    console.error('Error in apply API route:', error);
    return NextResponse.json({
      error: 'Erreur SMTP / Envoi du mail échoué: ' + error.message
    }, { status: 500 });
  }
}
