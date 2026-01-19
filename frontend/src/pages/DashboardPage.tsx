import React, { useEffect, useRef, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../hooks/redux';
import { Header } from '../components/Layout/Header';
import { Sidebar } from '../components/Layout/Sidebar';
import { setChannels } from '../store/slices/channelsSlice';
import { 
  setVideos,
  selectAllVideos,
  selectPendingVideos,
  selectPostedVideos,
  selectDailyPostCount,
  selectDailyPostLimit,
  selectCanPostToday,
  selectRemainingPostsToday,
} from '../store/slices/videosSlice';
import { channelsAPI, videosAPI } from '../services/api';
import api from '../services/api';
import '../styles/Dashboard.css';

interface DestinationChannel {
  id: number;
  channel_id: string;
  channel_name: string;
}

export const DashboardPage: React.FC = () => {
  const dispatch = useAppDispatch();
  
  // Channel state
  const channels = useAppSelector((state) => state.channels.channels);
  
  // Video selectors
  const videos = useAppSelector(selectAllVideos);
  const pendingVideos = useAppSelector(selectPendingVideos);
  const postedVideos = useAppSelector(selectPostedVideos);
  const dailyPostCount = useAppSelector(selectDailyPostCount);
  const dailyPostLimit = useAppSelector(selectDailyPostLimit);
  const canPostToday = useAppSelector(selectCanPostToday);
  const remainingPostsToday = useAppSelector(selectRemainingPostsToday);
  
  // Local state
  const loadedRef = useRef(false);
  const [destinationChannels, setDestinationChannels] = useState<DestinationChannel[]>([]);
  const [postingVideoId, setPostingVideoId] = useState<number | null>(null);
  const [fetchingChannelId, setFetchingChannelId] = useState<number | null>(null);
  const [deletingVideoId, setDeletingVideoId] = useState<number | null>(null);
  const [deletingSourceChannelId, setDeletingSourceChannelId] = useState<number | null>(null);

  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;

    loadChannels();
    loadVideos();
    loadDestinationChannels();
  }, []);

  const loadChannels = async () => {
    try {
      const response = await channelsAPI.getChannels();
      dispatch(setChannels(response.data));
    } catch (error) {
      console.error('Failed to load channels:', error);
    }
  };

  const loadVideos = async () => {
    try {
      const response = await videosAPI.getVideos();
      dispatch(setVideos(response.data));
    } catch (error) {
      console.error('Failed to load videos:', error);
    }
  };

  const loadDestinationChannels = async () => {
    try {
      const response = await api.get('/destination-channels');
      setDestinationChannels(response.data);
    } catch (error) {
      console.error('Failed to load destination channels:', error);
    }
  };

  const handleAddSourceChannel = async () => {
    const channelId = prompt('Enter YouTube channel ID (e.g., UCxxxxxxxxxxxxxxxx):');
    if (channelId) {
      try {
        await channelsAPI.addChannel(channelId, channelId);
        await loadChannels();
        alert('✓ Source channel added! Click "🔄 Fetch Videos" to load videos from this channel.');
      } catch (error: any) {
        alert(error.response?.data?.error || 'Failed to add source channel');
      }
    }
  };

  const handleDeleteSourceChannel = async (id: number, channelName: string) => {
    const videosFromChannel = videos.filter((v) => v.source_channel_id === id);
    
    let confirmMessage = `Delete source channel "${channelName}"?`;
    if (videosFromChannel.length > 0) {
      confirmMessage += `\n\n⚠️ This will also delete ${videosFromChannel.length} videos from this channel.`;
    }

    if (window.confirm(confirmMessage)) {
      setDeletingSourceChannelId(id);
      try {
        await channelsAPI.deleteChannel(id);
        await loadChannels();
        await loadVideos(); // Reload videos in case some were deleted
        alert('✓ Source channel deleted');
      } catch (error: any) {
        alert(error.response?.data?.error || 'Failed to delete source channel');
      } finally {
        setDeletingSourceChannelId(null);
      }
    }
  };

  const handleAddDestinationChannel = async () => {
    const channelId = prompt('Enter destination YouTube channel ID (e.g., UCxxxxxxxxxxxxxxxx):');
    if (!channelId) return;

    const channelName = prompt('Enter channel name (display name):');
    if (!channelName) return;

    try {
      await api.post('/destination-channels', {
        channel_id: channelId,
        channel_name: channelName,
      });
      await loadDestinationChannels();
      alert('✓ Destination channel added!');
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to add destination channel');
    }
  };

  const handleDeleteDestinationChannel = async (id: number) => {
    if (window.confirm('Delete this destination channel?')) {
      try {
        await api.delete(`/destination-channels/${id}`);
        await loadDestinationChannels();
        alert('✓ Destination channel deleted');
      } catch (error) {
        alert('Failed to delete destination channel');
      }
    }
  };

  const handleFetchVideos = async (channelId: number) => {
    setFetchingChannelId(channelId);
    try {
      const response = await videosAPI.fetchChannelVideos(channelId);
      await loadVideos();
      alert(`✓ Videos fetched successfully!\n\nAdded: ${response.data.added}\nSkipped (already exists): ${response.data.skipped}`);
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to fetch videos');
    } finally {
      setFetchingChannelId(null);
    }
  };

  const handlePostVideo = async (videoId: number) => {
    // Check daily limit using selector
    if (!canPostToday) {
      alert(`⚠️ Daily limit reached!\n\nYou can only post ${dailyPostLimit} videos per day.\nPosted today: ${dailyPostCount}/${dailyPostLimit}`);
      return;
    }

    if (!window.confirm('This will download the video and upload it to your destination channel. Continue?')) {
      return;
    }

    setPostingVideoId(videoId);
    try {
      const response = await videosAPI.postVideo(videoId);
      await loadVideos();
      alert(`✓ Video uploaded successfully!\n\nVideo ID: ${response.data.uploadedVideoId}\nDestination: ${response.data.destinationChannel}`);
    } catch (error: any) {
      const errorMsg = error.response?.data?.error || 'Failed to post video';
      const details = error.response?.data?.details || '';
      
      if (error.response?.data?.requiresAuth) {
        alert('⚠️ YouTube authorization required.\n\nGo to Settings to authorize YouTube upload.');
      } else {
        alert(`❌ ${errorMsg}\n\n${details}`);
      }
    } finally {
      setPostingVideoId(null);
    }
  };

  const handleDeleteVideo = async (videoId: number) => {
    if (window.confirm('Delete this video?')) {
      setDeletingVideoId(videoId);
      try {
        await videosAPI.deleteVideo(videoId);
        await loadVideos();
        alert('✓ Video deleted');
      } catch (error) {
        alert('Failed to delete video');
      } finally {
        setDeletingVideoId(null);
      }
    }
  };

  // Format duration from seconds to MM:SS or HH:MM:SS
  const formatDuration = (seconds?: number): string => {
    if (!seconds) return '--:--';
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Format view count
  const formatCount = (count?: number): string => {
    if (!count) return '0';
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  };

  // Get status color
  const getStatusColor = (status: string): { bg: string; text: string } => {
    switch (status) {
      case 'pending':
        return { bg: 'rgba(255, 165, 0, 0.2)', text: '#FFA500' };
      case 'posted':
        return { bg: 'rgba(0, 255, 0, 0.2)', text: '#00ff00' };
      case 'scheduled':
        return { bg: 'rgba(0, 150, 255, 0.2)', text: '#0096ff' };
      case 'failed':
        return { bg: 'rgba(255, 0, 0, 0.2)', text: '#ff6b6b' };
      default:
        return { bg: 'rgba(128, 128, 128, 0.2)', text: '#999999' };
    }
  };

  // Get video count for a source channel
  const getVideoCountForChannel = (channelId: number): number => {
    return videos.filter((v) => v.source_channel_id === channelId).length;
  };

  return (
    <div className="dashboard">
      <Header />
      <div className="dashboard-content">
        <Sidebar />
        <main className="main-content">
          {/* Stats Overview */}
          <section className="stats-section" style={{ marginBottom: '30px' }}>
            <div style={{ 
              display: 'flex', 
              gap: '20px', 
              flexWrap: 'wrap' 
            }}>
              {/* Pending Videos */}
              <div style={{
                backgroundColor: 'rgba(255, 165, 0, 0.1)',
                border: '1px solid rgba(255, 165, 0, 0.3)',
                borderRadius: '8px',
                padding: '15px 25px',
                minWidth: '150px',
              }}>
                <div style={{ color: '#FFA500', fontSize: '24px', fontWeight: 'bold' }}>
                  {pendingVideos.length}
                </div>
                <div style={{ color: '#999', fontSize: '13px' }}>Pending Videos</div>
              </div>
              
              {/* Posted Videos */}
              <div style={{
                backgroundColor: 'rgba(0, 255, 0, 0.1)',
                border: '1px solid rgba(0, 255, 0, 0.3)',
                borderRadius: '8px',
                padding: '15px 25px',
                minWidth: '150px',
              }}>
                <div style={{ color: '#00ff00', fontSize: '24px', fontWeight: 'bold' }}>
                  {postedVideos.length}
                </div>
                <div style={{ color: '#999', fontSize: '13px' }}>Posted Videos</div>
              </div>
              
              {/* Posted Today */}
              <div style={{
                backgroundColor: canPostToday 
                  ? 'rgba(0, 150, 255, 0.1)' 
                  : 'rgba(255, 0, 0, 0.1)',
                border: `1px solid ${canPostToday 
                  ? 'rgba(0, 150, 255, 0.3)' 
                  : 'rgba(255, 0, 0, 0.3)'}`,
                borderRadius: '8px',
                padding: '15px 25px',
                minWidth: '150px',
              }}>
                <div style={{ 
                  color: canPostToday ? '#0096ff' : '#ff6b6b', 
                  fontSize: '24px', 
                  fontWeight: 'bold' 
                }}>
                  {dailyPostCount}/{dailyPostLimit}
                </div>
                <div style={{ color: '#999', fontSize: '13px' }}>
                  {canPostToday ? 'Posted Today' : 'Limit Reached'}
                </div>
              </div>

              {/* Total Videos */}
              <div style={{
                backgroundColor: 'rgba(128, 128, 128, 0.1)',
                border: '1px solid rgba(128, 128, 128, 0.3)',
                borderRadius: '8px',
                padding: '15px 25px',
                minWidth: '150px',
              }}>
                <div style={{ color: '#aaa', fontSize: '24px', fontWeight: 'bold' }}>
                  {videos.length}
                </div>
                <div style={{ color: '#999', fontSize: '13px' }}>Total Videos</div>
              </div>
            </div>
          </section>

          {/* Source Channels Section */}
          <section className="channels-section">
            <h2>📥 Source Channels ({channels.length}/5)</h2>
            <p style={{ color: '#999', fontSize: '13px', marginTop: '-10px' }}>
              YouTube channels to fetch videos FROM
            </p>
            <button onClick={handleAddSourceChannel} className="btn-add-channel">
              + Add Source Channel
            </button>
            <div className="channels-list">
              {channels.length === 0 ? (
                <p style={{ color: '#999', padding: '20px' }}>
                  No source channels added yet. Click "Add Source Channel" to get started.
                </p>
              ) : (
                channels.map((ch) => {
                  const videoCount = getVideoCountForChannel(ch.id);
                  const isDeleting = deletingSourceChannelId === ch.id;
                  const isFetching = fetchingChannelId === ch.id;
                  
                  return (
                    <div 
                      key={ch.id} 
                      className="channel-card"
                      style={{
                        opacity: isDeleting ? 0.5 : 1,
                        transition: 'opacity 0.3s ease',
                      }}
                    >
                      <h3>📺 {ch.channel_name}</h3>
                      <p>{ch.channel_id}</p>
                      
                      {/* Video count badge */}
                      <div style={{
                        fontSize: '12px',
                        color: '#888',
                        marginTop: '5px',
                      }}>
                        📹 {videoCount} videos fetched
                      </div>
                      
                      {/* Action buttons */}
                      <div style={{
                        display: 'flex',
                        gap: '8px',
                        marginTop: '10px',
                        flexWrap: 'wrap',
                      }}>
                        <button
                          onClick={() => handleFetchVideos(ch.id)}
                          disabled={isFetching || isDeleting}
                          style={{ 
                            opacity: isFetching ? 0.6 : 1,
                            cursor: isFetching || isDeleting ? 'not-allowed' : 'pointer',
                            flex: 1,
                            minWidth: '100px',
                          }}
                          className="btn-fetch"
                        >
                          {isFetching ? '⏳ Fetching...' : '🔄 Fetch Videos'}
                        </button>
                        
                        <button
                          onClick={() => handleDeleteSourceChannel(ch.id, ch.channel_name)}
                          disabled={isDeleting || isFetching}
                          style={{ 
                            backgroundColor: 'rgba(255,0,0,0.2)', 
                            color: '#ff6b6b',
                            opacity: isDeleting ? 0.6 : 1,
                            cursor: isDeleting || isFetching ? 'not-allowed' : 'pointer',
                          }}
                          className="btn-fetch"
                        >
                          {isDeleting ? '⏳ Deleting...' : '🗑️ Remove'}
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </section>

          {/* Destination Channels Section */}
          <section className="channels-section" style={{ marginTop: '40px' }}>
            <h2>📤 Destination Channels ({destinationChannels.length})</h2>
            <p style={{ color: '#999', fontSize: '13px', marginTop: '-10px' }}>
              YouTube channels where videos will be posted
            </p>
            <button onClick={handleAddDestinationChannel} className="btn-add-channel">
              + Add Destination Channel
            </button>
            <div className="channels-list">
              {destinationChannels.length === 0 ? (
                <p style={{ color: '#999', padding: '20px' }}>
                  No destination channels added yet. Click "Add Destination Channel" to get started.
                </p>
              ) : (
                destinationChannels.map((ch) => (
                  <div key={ch.id} className="channel-card">
                    <h3>🎥 {ch.channel_name}</h3>
                    <p>{ch.channel_id}</p>
                    <button
                      onClick={() => handleDeleteDestinationChannel(ch.id)}
                      style={{ marginTop: '10px', backgroundColor: 'rgba(255,0,0,0.2)', color: '#ff6b6b' }}
                      className="btn-fetch"
                    >
                      🗑️ Remove
                    </button>
                  </div>
                ))
              )}
            </div>
          </section>

          {/* Videos Section */}
          <section className="videos-section" style={{ marginTop: '40px' }}>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              marginBottom: '15px',
            }}>
              <div>
                <h2 style={{ margin: 0 }}>🎬 Recent Videos ({videos.length})</h2>
                <p style={{ color: '#999', fontSize: '13px', margin: '5px 0 0 0' }}>
                  Showing up to {dailyPostLimit} videos • {remainingPostsToday} posts remaining today
                </p>
              </div>
              
              {!canPostToday && (
                <div style={{
                  backgroundColor: 'rgba(255, 165, 0, 0.1)',
                  border: '1px solid rgba(255, 165, 0, 0.3)',
                  borderRadius: '6px',
                  padding: '8px 15px',
                  fontSize: '12px',
                  color: '#FFA500',
                }}>
                  ⚠️ Daily limit reached. Come back tomorrow!
                </div>
              )}
            </div>
            
            <div className="videos-list">
              {videos.length === 0 ? (
                <div style={{ 
                  color: '#999', 
                  padding: '40px 20px',
                  textAlign: 'center',
                  backgroundColor: 'rgba(255, 255, 255, 0.02)',
                  borderRadius: '8px',
                  border: '1px dashed rgba(255, 255, 255, 0.1)',
                }}>
                  <div style={{ fontSize: '48px', marginBottom: '15px' }}>📹</div>
                  <p style={{ margin: 0 }}>No videos yet. Add a source channel and click "Fetch Videos".</p>
                </div>
              ) : (
                videos.slice(0, dailyPostLimit).map((video) => {
                  const statusColors = getStatusColor(video.status);
                  const isPosting = postingVideoId === video.id;
                  const isDeleting = deletingVideoId === video.id;
                  
                  return (
                    <div 
                      key={video.id} 
                      className="video-card"
                      style={{
                        display: 'flex',
                        gap: '15px',
                        padding: '15px',
                        backgroundColor: 'rgba(255, 255, 255, 0.02)',
                        borderRadius: '8px',
                        marginBottom: '15px',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        opacity: isDeleting ? 0.5 : 1,
                        transition: 'opacity 0.3s ease',
                      }}
                    >
                      {/* Thumbnail */}
                      <div style={{ 
                        position: 'relative',
                        flexShrink: 0,
                        width: '160px',
                        height: '90px',
                        borderRadius: '6px',
                        overflow: 'hidden',
                        backgroundColor: '#000',
                      }}>
                        {video.thumbnail_url ? (
                          <img 
                            src={video.thumbnail_url} 
                            alt={video.title}
                            style={{
                              width: '100%',
                              height: '100%',
                              objectFit: 'cover',
                            }}
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none';
                            }}
                          />
                        ) : (
                          <div style={{
                            width: '100%',
                            height: '100%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            backgroundColor: '#333',
                            color: '#666',
                            fontSize: '32px',
                          }}>
                            🎬
                          </div>
                        )}
                        {/* Duration badge */}
                        <div style={{
                          position: 'absolute',
                          bottom: '5px',
                          right: '5px',
                          backgroundColor: 'rgba(0, 0, 0, 0.8)',
                          color: '#fff',
                          padding: '2px 6px',
                          borderRadius: '3px',
                          fontSize: '11px',
                          fontWeight: '600',
                        }}>
                          {formatDuration(video.duration)}
                        </div>
                      </div>

                      {/* Video Info */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <h4 style={{ 
                          margin: '0 0 8px 0',
                          fontSize: '15px',
                          fontWeight: '600',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}>
                          {video.title}
                        </h4>
                        
                        <p style={{ 
                          color: '#999', 
                          fontSize: '12px', 
                          margin: '0 0 10px 0',
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                          lineHeight: '1.4',
                        }}>
                          {video.description?.substring(0, 150) || 'No description'}
                        </p>

                        {/* Stats Row */}
                        <div style={{ 
                          display: 'flex', 
                          gap: '15px', 
                          alignItems: 'center',
                          flexWrap: 'wrap',
                        }}>
                          <span style={{ color: '#888', fontSize: '12px' }}>
                            👁️ {formatCount(video.view_count)}
                          </span>
                          <span style={{ color: '#888', fontSize: '12px' }}>
                            👍 {formatCount(video.like_count)}
                          </span>
                          <span style={{ color: '#888', fontSize: '12px' }}>
                            💬 {formatCount(video.comment_count)}
                          </span>
                          
                          {/* Status Badge */}
                          <span
                            style={{
                              padding: '3px 10px',
                              borderRadius: '4px',
                              fontSize: '11px',
                              fontWeight: '600',
                              backgroundColor: statusColors.bg,
                              color: statusColors.text,
                            }}
                          >
                            {video.status?.toUpperCase()}
                          </span>

                          {/* Video ID */}
                          <span style={{ 
                            color: '#555', 
                            fontSize: '11px',
                            fontFamily: 'monospace',
                          }}>
                            ID: {video.video_id}
                          </span>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px',
                        justifyContent: 'center',
                        minWidth: '120px',
                      }}>
                        {video.status === 'pending' && (
                          <button
                            onClick={() => handlePostVideo(video.id)}
                            disabled={isPosting || !canPostToday}
                            style={{
                              padding: '8px 16px',
                              backgroundColor: isPosting 
                                ? 'rgba(128, 128, 128, 0.3)' 
                                : 'rgba(0, 200, 0, 0.3)',
                              color: isPosting ? '#888' : '#00ff00',
                              border: `1px solid ${isPosting ? '#888' : '#00ff00'}`,
                              borderRadius: '4px',
                              cursor: isPosting || !canPostToday 
                                ? 'not-allowed' 
                                : 'pointer',
                              fontSize: '12px',
                              fontWeight: '600',
                              opacity: !canPostToday ? 0.5 : 1,
                              whiteSpace: 'nowrap',
                              transition: 'all 0.2s ease',
                            }}
                          >
                            {isPosting ? '⏳ Uploading...' : '▶️ Post Now'}
                          </button>
                        )}

                        {video.status === 'scheduled' && video.scheduled_at && (
                          <div style={{
                            padding: '8px 12px',
                            backgroundColor: 'rgba(0, 150, 255, 0.1)',
                            borderRadius: '4px',
                            fontSize: '11px',
                            color: '#0096ff',
                            textAlign: 'center',
                          }}>
                            🕐 {new Date(video.scheduled_at).toLocaleDateString()}
                          </div>
                        )}
                        
                        {video.status === 'posted' && video.posted_at && (
                          <div style={{
                            padding: '8px 12px',
                            backgroundColor: 'rgba(0, 255, 0, 0.1)',
                            borderRadius: '4px',
                            fontSize: '11px',
                            color: '#00ff00',
                            textAlign: 'center',
                          }}>
                            ✓ Posted {new Date(video.posted_at).toLocaleDateString()}
                          </div>
                        )}

                        {video.status === 'failed' && (
                          <button
                            onClick={() => handlePostVideo(video.id)}
                            disabled={isPosting || !canPostToday}
                            style={{
                              padding: '8px 16px',
                              backgroundColor: 'rgba(255, 165, 0, 0.3)',
                              color: '#FFA500',
                              border: '1px solid #FFA500',
                              borderRadius: '4px',
                              cursor: isPosting || !canPostToday ? 'not-allowed' : 'pointer',
                              fontSize: '12px',
                              fontWeight: '600',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            🔄 Retry
                          </button>
                        )}
                        
                        <button
                          onClick={() => handleDeleteVideo(video.id)}
                          disabled={isDeleting}
                          style={{
                            padding: '8px 16px',
                            backgroundColor: 'rgba(255, 0, 0, 0.2)',
                            color: '#ff6b6b',
                            border: '1px solid #ff6b6b',
                            borderRadius: '4px',
                            cursor: isDeleting ? 'not-allowed' : 'pointer',
                            fontSize: '12px',
                            fontWeight: '600',
                            opacity: isDeleting ? 0.5 : 1,
                            transition: 'all 0.2s ease',
                          }}
                        >
                          {isDeleting ? '⏳ Deleting...' : '🗑️ Delete'}
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Show more videos indicator */}
            {videos.length > dailyPostLimit && (
              <div style={{ 
                color: '#666', 
                fontSize: '13px', 
                textAlign: 'center',
                marginTop: '20px',
                padding: '15px',
                backgroundColor: 'rgba(255, 255, 255, 0.02)',
                borderRadius: '8px',
                border: '1px dashed rgba(255, 255, 255, 0.1)',
              }}>
                <span style={{ fontSize: '16px', marginRight: '8px' }}>📦</span>
                +{videos.length - dailyPostLimit} more videos available • Daily limit: {dailyPostLimit} posts
              </div>
            )}
          </section>
        </main>
      </div>
    </div>
  );
};

export default DashboardPage;