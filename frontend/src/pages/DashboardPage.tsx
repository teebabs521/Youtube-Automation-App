import React, { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../hooks/redux';
import { Header } from '../components/Layout/Header';
import { Sidebar } from '../components/Layout/Sidebar';
import { setChannels } from '../store/slices/channelsSlice';
import { setVideos } from '../store/slices/videosSlice';
import { channelsAPI, videosAPI } from '../services/api';
import '../styles/Dashboard.css';

export const DashboardPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const channels = useAppSelector((state) => state.channels.channels);
  const videos = useAppSelector((state) => state.videos.videos);

  useEffect(() => {
    loadChannels();
    loadVideos();
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

  const handleAddChannel = async () => {
    const channelId = prompt('Enter YouTube channel ID or @handle:');
    if (channelId) {
      try {
        await channelsAPI.addChannel(channelId, channelId);
        loadChannels();
      } catch (error) {
        alert('Failed to add channel');
      }
    }
  };

  return (
    <div className="dashboard">
      <Header />
      <div className="dashboard-content">
        <Sidebar />
        <main className="main-content">
          <section className="channels-section">
            <h2>Source Channels ({channels.length}/5)</h2>
            <button onClick={handleAddChannel}>+ Add Channel</button>
            <div className="channels-list">
              {channels.map((ch) => (
                <div key={ch.id} className="channel-card">
                  <h3>{ch.channel_name}</h3>
                  <p>{ch.channel_id}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="videos-section">
            <h2>Recent Videos ({videos.length})</h2>
            <div className="videos-list">
              {videos.slice(0, 10).map((video) => (
                <div key={video.id} className="video-card">
                  <h4>{video.title}</h4>
                  <span className={`status ${video.status}`}>{video.status}</span>
                </div>
              ))}
            </div>
          </section>
        </main>
      </div>
    </div>
  );
};

export default DashboardPage;
