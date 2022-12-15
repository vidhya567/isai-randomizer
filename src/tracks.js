import { useEffect, useState } from "react";

function getTracks(url, accessToken) {
  const fetchOptions = {
    headers: constructSpotifyHeader(accessToken),
  };
  return callSpotifyApi(url, fetchOptions);
}

function callSpotifyApi(url, fetchOptions) {
  return fetch(url, fetchOptions)
    .then((response) => response.json())
    .then((response) => {
      if (response?.error) {
        throw Error(response?.error.message);
      }
      return response;
    });
}

function constructSpotifyHeader(accessToken) {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${accessToken}`,
  };
}

function addSongToQueue(trackUri, accessToken) {
  const url = `https://api.spotify.com/v1/me/player/queue?uri=${trackUri}`;
  const fetchOptions = {
    method: "POST",
    headers: constructSpotifyHeader(accessToken),
  };
  return callSpotifyApi(url, fetchOptions);
}

const INITIAL_TRACK_URL = "https://api.spotify.com/v1/me/tracks?limit=50";

function getTracksRecursively(url, tracks, accessToken) {
  const tracksPromise = getTracks(url, accessToken);
  return tracksPromise
    .then((tracksResponse) => {
      const newTracks = tracksResponse?.items ?? [];
      const trackList = [...tracks, ...newTracks];
      const { next } = tracksResponse;
      if (next) {
        return getTracksRecursively(next, trackList, accessToken);
      }
      return trackList;
    })
    .catch((error) => {
      throw error;
    });
}

function getAllTracks(accessToken) {
  return getTracksRecursively(INITIAL_TRACK_URL, [], accessToken);
}

export default function Tracks(props) {
  const { accessToken } = props;
  const [tracksData, setTracksData] = useState([]);
  const [playingTrackId, setPlayingTrackId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [currentTracks, setCurrentTracks] = useState([]);
  const [statusText, setStatusText] = useState("Select song to play");

  useEffect(() => {
    setLoading(true);
    getAllTracks(accessToken)
      .then((allTracks) => {
        if (allTracks.length > 0) {
          setTracksData(allTracks);
          setLoading(false);
          const randomTracks = pickRandomTracks(allTracks);
          setCurrentTracks(randomTracks);
        }
      })
      .catch(handleAsyncError);
  }, [accessToken]);

  function pickRandomTracks(allTracks) {
    const size = allTracks?.length ?? 0;
    if (!size) {
      return [];
    }
    const randomIndices = pickRandomIndices(10, size);
    const randomTracks = randomIndices.map(
      (randomIndex) => allTracks[randomIndex]
    );
    return randomTracks;
  }

  function pickRandomIndices(randomSize, dataSize) {
    const randomIndices = [];
    for (let i = 0; i < randomSize; i++) {
      const randomIndex = Math.floor(Math.random() * dataSize);
      randomIndices.push(randomIndex);
    }
    return randomIndices;
  }

  function renderAudio() {
    if (!currentTracks.length || !playingTrackId) {
      return;
    }
    const { track } = findTrackById(playingTrackId);
    if (!track) {
      return <p className="status_text">Track not available</p>;
    }
    const { preview_url } = track;

    if (!preview_url) {
      return <p className="status_text">Preview not available</p>;
    }

    return (
      <div className="preview_player">
        <audio autoPlay controls src={track.preview_url} />
        <span>playing {track.name}</span>
      </div>
    );
  }

  function findTrackById(trackId) {
    return tracksData.find(({ track }) => track.id === trackId);
  }

  function handleAddSong(track) {
    if (track.uri) {
      addSongToQueue(track.uri, accessToken).catch(handleAsyncError);
    }
  }

  function renderTracks() {
    const tracks = currentTracks ?? [];
    return (
      <ul className="track_list">
        {tracks.map(({ track }, index) => (
          <li key={track.id} className="track_list_item">
            <span className="track_title">
              {track.name}
              <span className="track_title_tooltip">{track.name}</span>
            </span>
            <div className="track_actions">
              <button onClick={() => handleTrackPlayClick(track.id)}>
                Preview
              </button>
              <button onClick={() => handleAddSong(track)}>Add</button>
            </div>
          </li>
        ))}
      </ul>
    );
  }

  function handleTrackPlayClick(trackId) {
    setPlayingTrackId(trackId);
  }

  function handleRandomClick() {
    const randomTracks = pickRandomTracks(tracksData ?? []);
    setCurrentTracks(randomTracks);
  }

  function handleAsyncError(error) {
    console.log(error);
    console.log(error.message);
    console.log(typeof error.message);
    if (typeof error === "string") setStatusText(error);
    if (error.message && typeof error.message === "string") {
      console.log("setting error message");
      setStatusText(error.message);
    }
  }

  function addAllSongsToQueue() {
    currentTracks.forEach(({ track }) => {
      if (track.uri) {
        addSongToQueue(track.uri, accessToken).catch(handleAsyncError);
      }
    });
  }

  function renderStatus() {
    if (statusText) {
      return <p className="status_text">{statusText}</p>;
    }
  }

  function renderData() {
    return (
      <div>
        {renderStatus()}
        {renderAudio()}
        <h3>Tracks</h3>
        <div className="track_bulk_actions">
          <button onClick={handleRandomClick}> Randomize </button>
          <button onClick={addAllSongsToQueue}> Add all songs to queue</button>
        </div>
        {renderTracks()}
      </div>
    );
  }

  if (loading) {
    return (
      <p className="status_text">
        Loading all your liked songs ... please wait
      </p>
    );
  } else {
    return renderData();
  }
}
