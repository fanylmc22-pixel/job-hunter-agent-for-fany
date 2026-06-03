import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { searchJobs } from '@/lib/scraper';
import { evaluateJobCompatibility } from '@/lib/evaluator';

export const maxDuration = 60; // Allow Vercel execution up to 60s

export async function POST(request) {
  return handleSearch(request);
}

export async function GET(request) {
  // Allow GET requests for simple testing / browser triggers / Vercel crons
  return handleSearch(request);
}

async function handleSearch(request) {
  try {
    // Check CRON_SECRET for security on automated vercel crons if configured
    const authHeader = request.headers.get('authorization');
    const hasCronSecret = !!process.env.CRON_SECRET;
    
    if (hasCronSecret && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      const url = new URL(request.url);
      const keyParam = url.searchParams.get('key');
      if (keyParam !== process.env.CRON_SECRET) {
        return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 });
      }
    }

    // 1. Fetch default profile
    let profile = await prisma.profile.findUnique({
      where: { id: 'default' },
    });

    if (!profile) {
      // Create empty profile if not existing yet
      profile = await prisma.profile.create({
        data: {
          id: 'default',
          name: 'Fany',
          email: '',
          targetEmail: '',
          searchKeywords: 'Développeur React, Développeur Node',
          location: 'Télétravail, Paris',
          resumeText: '',
          gmailUser: '',
          gmailAppPassword: '',
          geminiApiKey: '',
        },
      });
    }

    if (!profile.resumeText) {
      return NextResponse.json({
        success: false,
        message: 'Recherche annulée : Aucun CV n\'a été configuré dans le profil.'
      }, { status: 200 });
    }

    const keywords = profile.searchKeywords;
    const location = profile.location;
    const apiKey = profile.geminiApiKey || process.env.GEMINI_API_KEY;

    // 2. Call scraper to fetch new matching jobs
    console.log(`Starting search cron with keywords: "${keywords}", location: "${location}"`);
    const jobsFound = await searchJobs(keywords, location, apiKey);
    
    let addedCount = 0;
    let duplicateCount = 0;
    const processedJobs = [];

    // 3. Evaluate and save new jobs
    for (const jobData of jobsFound) {
      // Check for duplicate
      const existingJob = await prisma.job.findUnique({
        where: { url: jobData.url }
      });

      if (existingJob) {
        duplicateCount++;
        continue;
      }

      // Evaluate match with Gemini
      console.log(`Evaluating match for: ${jobData.title} at ${jobData.company}...`);
      const evaluation = await evaluateJobCompatibility({
        jobTitle: jobData.title,
        company: jobData.company,
        description: jobData.description,
        resumeText: profile.resumeText,
        candidateName: profile.name,
        geminiApiKey: apiKey
      });

      // Save job with evaluation metrics
      const newJob = await prisma.job.create({
        data: {
          title: jobData.title,
          company: jobData.company,
          description: jobData.description,
          url: jobData.url,
          source: jobData.source,
          score: evaluation.score,
          compatibilityReason: evaluation.compatibilityReason,
          suggestedResumeChanges: evaluation.suggestedResumeChanges,
          customCoverLetter: evaluation.customCoverLetter,
          status: 'NEW'
        }
      });

      processedJobs.push(newJob);
      addedCount++;
    }

    console.log(`Search completed. Found: ${jobsFound.length}, Added: ${addedCount}, Duplicates skipped: ${duplicateCount}`);

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      summary: {
        totalScraped: jobsFound.length,
        added: addedCount,
        duplicates: duplicateCount
      },
      jobs: processedJobs
    });

  } catch (error) {
    console.error('Error in search cron handler:', error);
    return NextResponse.json({
      success: false,
      error: 'Erreur interne de recherche: ' + error.message
    }, { status: 500 });
  }
}
