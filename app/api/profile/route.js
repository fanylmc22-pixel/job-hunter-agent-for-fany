import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET() {
  try {
    let profile = await prisma.profile.findUnique({
      where: { id: 'default' },
    });

    if (!profile) {
      profile = await prisma.profile.create({
        data: {
          id: 'default',
          name: 'Fany',
          email: '',
          targetEmail: '',
          searchKeywords: 'Développeur React, Développeur Node',
          location: 'Télétravail, Paris',
          resumeText: '',
          resumeFileName: '',
          gmailUser: '',
          gmailAppPassword: '',
          geminiApiKey: '',
        },
      });
    }

    // Mask passwords for safety before returning
    const safeProfile = {
      ...profile,
      gmailAppPassword: profile.gmailAppPassword ? '********' : '',
    };

    return NextResponse.json(safeProfile);
  } catch (error) {
    console.error('Erreur profil GET:', error);
    return NextResponse.json({ error: 'Erreur serveur lors de la récupération du profil.' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const data = await request.json();
    
    // Check if password is plain or masked
    let updateData = { ...data };
    if (data.gmailAppPassword === '********') {
      // Don't update the password if it's masked
      delete updateData.gmailAppPassword;
    }

    // Remove id and timestamps from manual update
    delete updateData.id;
    delete updateData.createdAt;
    delete updateData.updatedAt;

    const profile = await prisma.profile.upsert({
      where: { id: 'default' },
      update: updateData,
      create: {
        id: 'default',
        ...updateData,
      },
    });

    const safeProfile = {
      ...profile,
      gmailAppPassword: profile.gmailAppPassword ? '********' : '',
    };

    return NextResponse.json({ success: true, profile: safeProfile });
  } catch (error) {
    console.error('Erreur profil POST:', error);
    return NextResponse.json({ error: 'Erreur serveur lors de la mise à jour du profil.' }, { status: 500 });
  }
}
