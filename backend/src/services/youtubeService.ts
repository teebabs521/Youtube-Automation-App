import { google } from 'googleapis';
import dotenv from 'dotenv';

dotenv.config();

const youtube = google.youtube({
  version: 'v3',
  auth: process.env.YOUTUBE_API_KEY,
});

export class YouTubeService {
  async getChannelInfo(channelId: string) {
    try {
      const response = await youtube.channels.list({
        part: ['snippet', 'statistics'],
        forUsername: channelId,
        hl: 'en',
      } as any);

      return response.data.items?.[0] || null;
    } catch (error) {
      throw new Error('Failed to fetch channel info');
    }
  }

  async getChannelVideos(channelId: string, maxResults: number = 25) {
    try {
      const channelInfo = await this.getChannelInfo(channelId);
      if (!channelInfo) throw new Error('Channel not found');

      const uploadsPlaylistId = channelInfo.contentDetails?.relatedPlaylists?.uploads;
      if (!uploadsPlaylistId) throw new Error('No uploads playlist');

      const response = await youtube.playlistItems.list({
        part: ['snippet'],
        playlistId: uploadsPlaylistId,
        maxResults,
      } as any);

      return response.data.items || [];
    } catch (error) {
      throw new Error('Failed to fetch videos');
    }
  }

  async getVideoDetails(videoId: string) {
    try {
      const response = await youtube.videos.list({
        part: ['snippet', 'contentDetails', 'statistics'],
        id: [videoId],
      } as any);

      return response.data.items?.[0] || null;
    } catch (error) {
      throw new Error('Failed to fetch video details');
    }
  }

  async insertVideo(accessToken: string, channelId: string, videoData: any) {
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

      const response = await youtubeAuth.videos.insert(
        {
          part: ['snippet', 'status'],
          requestBody: {
            snippet: {
              title: videoData.title,
              description: videoData.description,
              tags: videoData.tags,
            },
            status: {
              privacyStatus: videoData.privacyStatus || 'private',
              publishAt: videoData.scheduledStartTime,
            },
          },
        } as any,
        {}
      );

      return response.data;
    } catch (error) {
      throw new Error('Failed to insert video');
    }
  }

  parseDuration(duration: string): number {
    const regex = /PT(\d+H)?(\d+M)?(\d+S)?/;
    const matches = duration.match(regex);
    let seconds = 0;

    if (matches?.[1]) seconds += parseInt(matches[1]) * 3600;
    if (matches?.[2]) seconds += parseInt(matches[2]) * 60;
    if (matches?.[3]) seconds += parseInt(matches[3]);

    return seconds;
  }
}
