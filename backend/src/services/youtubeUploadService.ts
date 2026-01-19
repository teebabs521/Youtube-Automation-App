import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { exec, spawn } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

dotenv.config();

export class YouTubeUploadService {
  private oauth2Client: OAuth2Client;
  private youtube: any;

  constructor() {
    this.oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.YOUTUBE_REDIRECT_URI || 'http://localhost:5000/api/youtube/callback'
    ) as any;

    this.youtube = google.youtube({
      version: 'v3',
      auth: process.env.YOUTUBE_API_KEY,
    });
  }

  getAuthUrl(): string {
    const scopes = [
      'https://www.googleapis.com/auth/youtube.upload',
      'https://www.googleapis.com/auth/youtube',
      'https://www.googleapis.com/auth/userinfo.profile',
    ];

    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      prompt: 'consent',
    });
  }

  async exchangeCodeForTokens(code: string) {
    try {
      const { tokens } = await this.oauth2Client.getToken(code);
      return {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiryDate: tokens.expiry_date,
      };
    } catch (error) {
      console.error('Failed to exchange code for tokens:', error);
      throw new Error('Failed to get YouTube authorization tokens');
    }
  }

  async refreshAccessToken(refreshToken: string) {
    try {
      this.oauth2Client.setCredentials({ refresh_token: refreshToken });
      const { credentials } = await this.oauth2Client.refreshAccessToken();
      return {
        accessToken: credentials.access_token,
        expiryDate: credentials.expiry_date,
      };
    } catch (error) {
      console.error('Failed to refresh access token:', error);
      throw new Error('Failed to refresh YouTube authorization');
    }
  }

  /**
   * Download video using yt-dlp with multiple fallback methods
   */
  async downloadVideo(videoId: string, outputPath?: string): Promise<string> {
    console.log(`Starting download for video: ${videoId}`);

    const tempDir = outputPath || os.tmpdir();
    
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    const filePath = path.join(tempDir, `${videoId}.mp4`);
    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;

    // Remove existing file if present
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // Try multiple download methods
    const methods = [
      () => this.downloadWithYtDlp(videoUrl, filePath),
      () => this.downloadWithYtDlpCookies(videoUrl, filePath),
      () => this.downloadWithDistube(videoUrl, filePath),
    ];

    for (let i = 0; i < methods.length; i++) {
      try {
        console.log(`Trying download method ${i + 1}...`);
        await methods[i]();
        
        // Verify file exists and has content
        if (fs.existsSync(filePath) && fs.statSync(filePath).size > 0) {
          console.log(`Download successful with method ${i + 1}`);
          return filePath;
        }
      } catch (error: any) {
        console.log(`Method ${i + 1} failed: ${error.message}`);
      }
    }

    throw new Error('All download methods failed. The video may be restricted or unavailable.');
  }

  /**
   * Download using yt-dlp (basic)
   */
  private async downloadWithYtDlp(videoUrl: string, filePath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const args = [
        '-f', 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best',
        '-o', filePath,
        '--no-playlist',
        '--no-warnings',
        videoUrl
      ];

      console.log(`Executing: yt-dlp ${args.join(' ')}`);

      const process = spawn('yt-dlp', args, { shell: true });

      let stderr = '';

      process.stdout.on('data', (data) => {
        console.log(`yt-dlp: ${data}`);
      });

      process.stderr.on('data', (data) => {
        stderr += data.toString();
        console.error(`yt-dlp stderr: ${data}`);
      });

      process.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`yt-dlp exited with code ${code}: ${stderr}`));
        }
      });

      process.on('error', (err) => {
        reject(new Error(`Failed to start yt-dlp: ${err.message}`));
      });

      // Timeout after 10 minutes
      setTimeout(() => {
        process.kill();
        reject(new Error('Download timeout'));
      }, 600000);
    });
  }

  /**
   * Download using yt-dlp with browser cookies
   */
  private async downloadWithYtDlpCookies(videoUrl: string, filePath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      // Try to use cookies from Chrome, Firefox, or Edge
      const browsers = ['chrome', 'firefox', 'edge', 'brave'];
      
      const tryWithBrowser = async (browserIndex: number) => {
        if (browserIndex >= browsers.length) {
          reject(new Error('All browsers failed'));
          return;
        }

        const browser = browsers[browserIndex];
        const args = [
          '-f', 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best',
          '-o', filePath,
          '--cookies-from-browser', browser,
          '--no-playlist',
          '--no-warnings',
          videoUrl
        ];

        console.log(`Trying with ${browser} cookies...`);

        const process = spawn('yt-dlp', args, { shell: true });

        let stderr = '';

        process.stderr.on('data', (data) => {
          stderr += data.toString();
        });

        process.on('close', (code) => {
          if (code === 0 && fs.existsSync(filePath) && fs.statSync(filePath).size > 0) {
            resolve();
          } else {
            tryWithBrowser(browserIndex + 1);
          }
        });

        process.on('error', () => {
          tryWithBrowser(browserIndex + 1);
        });
      };

      tryWithBrowser(0);
    });
  }

  /**
   * Download using @distube/ytdl-core
   */
  private async downloadWithDistube(videoUrl: string, filePath: string): Promise<void> {
    return new Promise(async (resolve, reject) => {
      try {
        let ytdl;
        try {
          ytdl = require('@distube/ytdl-core');
        } catch {
          ytdl = require('ytdl-core');
        }

        if (!ytdl) {
          reject(new Error('No ytdl library available'));
          return;
        }

        console.log('Downloading with ytdl-core...');

        const video = ytdl(videoUrl, {
          quality: 'highest',
          filter: 'audioandvideo',
        });

        const writeStream = fs.createWriteStream(filePath);

        video.pipe(writeStream);

        video.on('error', (err: Error) => {
          reject(err);
        });

        writeStream.on('finish', () => {
          resolve();
        });

        writeStream.on('error', (err: Error) => {
          reject(err);
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Upload video to YouTube destination channel
   */
  async uploadVideoToYouTube(
    videoFilePath: string,
    title: string,
    description: string,
    tags: string[],
    accessToken: string,
    privacyStatus: string = 'public'
  ): Promise<string> {
    try {
      const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET
      );

      oauth2Client.setCredentials({ access_token: accessToken });

      const youtubeAuth = google.youtube({
        version: 'v3',
        auth: oauth2Client,
      });

      if (!fs.existsSync(videoFilePath)) {
        throw new Error(`Video file not found: ${videoFilePath}`);
      }

      const fileSize = fs.statSync(videoFilePath).size;
      console.log(`Uploading video: ${title} (Size: ${(fileSize / (1024 * 1024)).toFixed(2)} MB)`);

      const response = await youtubeAuth.videos.insert(
        {
          part: ['snippet', 'status'],
          requestBody: {
            snippet: {
              title: title.substring(0, 100),
              description: description.substring(0, 5000),
              tags: tags.slice(0, 30),
              categoryId: '22',
            },
            status: {
              privacyStatus: privacyStatus,
              selfDeclaredMadeForKids: false,
            },
          },
          media: {
            body: fs.createReadStream(videoFilePath),
          },
        },
        {
          onUploadProgress: (evt: any) => {
            const progress = ((evt.bytesRead || 0) / fileSize) * 100;
            process.stdout.write(`\rUpload progress: ${Math.round(progress)}%`);
          },
        }
      );

      console.log('\nUpload completed!');

      const uploadedVideoId = response.data.id || 'unknown';
      console.log(`Video uploaded successfully. Video ID: ${uploadedVideoId}`);

      // Clean up
      try {
        fs.unlinkSync(videoFilePath);
      } catch (e) {
        console.warn(`Failed to delete temp file: ${videoFilePath}`);
      }

      return uploadedVideoId;
    } catch (error: any) {
      console.error('Failed to upload video to YouTube:', error);
      throw new Error('Failed to upload video to YouTube: ' + error.message);
    }
  }

  async getVideoDetails(videoId: string) {
    try {
      const response = await this.youtube.videos.list({
        part: ['snippet', 'statistics', 'processingDetails'],
        id: [videoId],
      });
      return response.data.items?.[0] || null;
    } catch (error) {
      console.error('Failed to get video details:', error);
      throw new Error('Failed to get video details');
    }
  }

  async updateVideoMetadata(
    videoId: string,
    title: string,
    description: string,
    accessToken: string
  ) {
    try {
      const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET
      );
      oauth2Client.setCredentials({ access_token: accessToken });

      const youtubeAuth = google.youtube({
        version: 'v3',
        auth: oauth2Client,
      });

      const response = await youtubeAuth.videos.update({
        part: ['snippet'],
        requestBody: {
          id: videoId,
          snippet: {
            title: title.substring(0, 100),
            description: description.substring(0, 5000),
          },
        },
      });

      return response.data;
    } catch (error) {
      console.error('Failed to update video metadata:', error);
      throw new Error('Failed to update video metadata');
    }
  }

  async checkUploadQuota(accessToken: string): Promise<{ bytesUsed: number; bytesQuota: number }> {
    return { bytesUsed: 0, bytesQuota: 1099511627776 };
  }
}

export default YouTubeUploadService;