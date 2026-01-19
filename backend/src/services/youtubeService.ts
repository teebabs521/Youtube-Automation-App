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
        part: ['snippet', 'statistics', 'contentDetails'],
        id: [channelId],
        hl: 'en',
      } as any);
      return response.data.items?.[0] || null;
    } catch (error) {
      console.error('Failed to fetch channel info:', error);
      throw new Error('Failed to fetch channel info');
    }
  }

  async getChannelVideos(channelId: string, maxResults: number = 25) {
    try {
      const channelInfo = await this.getChannelInfo(channelId);
      if (!channelInfo) throw new Error('Channel not found');

      const uploadsPlaylistId = channelInfo.contentDetails?.relatedPlaylists?.uploads;
      if (!uploadsPlaylistId) throw new Error('No uploads playlist found for this channel');

      const response = await youtube.playlistItems.list({
        part: ['snippet', 'contentDetails'],
        playlistId: uploadsPlaylistId,
        maxResults,
      } as any);

      // Get full video details including duration and statistics
      const videoIds = response.data.items?.map(
        (item: any) => item.contentDetails?.videoId || item.snippet?.resourceId?.videoId
      ).filter(Boolean) || [];

      if (videoIds.length === 0) {
        return [];
      }

      // Fetch detailed info for all videos
      const detailsResponse = await youtube.videos.list({
        part: ['snippet', 'contentDetails', 'statistics'],
        id: videoIds,
      } as any);

      return detailsResponse.data.items || [];
    } catch (error) {
      console.error('Failed to fetch videos:', error);
      throw new Error('Failed to fetch videos: ' + (error as any).message);
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
      console.error('Failed to fetch video details:', error);
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
      console.error('Failed to insert video:', error);
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