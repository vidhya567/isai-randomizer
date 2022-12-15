import { useEffect, useState } from "react";

function getTracks(url, accessToken) {
  const fetchOptions = {
    headers: constructSpotifyHeader(accessToken),
  };
  return callSpotifyApi(url, fetchOptions);
}

function callSpotifyApi(url, fetchOptions) {
  return fetch(url, fetchOptions)
    .then((response) => {
      if (response.status === 204) {
        return response;
      }
      return response.json();
    })
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

const INITIAL_TRACK_URL = "https://api.spotify.com/v1/me/tracks?limit=10";

function getAllTracks(accessToken) {
  const url = (offset) =>
    `https://api.spotify.com/v1/me/tracks?limit=50&offset=${offset}`;
  const generateUrls = (total) => {
    const offsets = [0];
    let offset = 50;
    while (offset < total) {
      offsets.push(offset);
      offset += 50;
    }
    return offsets.map(url);
  };
  const tracksPromise = getTracks(INITIAL_TRACK_URL, accessToken);
  return tracksPromise
    .then((tracksResponse) => {
      const { total } = tracksResponse;
      if (!total) {
        throw Error("Cant get the total track size");
      }
      const urls = generateUrls(total);
      const trackPromises = urls.map((url) => getTracks(url, accessToken));
      return Promise.all(trackPromises);
    })
    .then((trackResponses) => {
      return trackResponses.map(({ items }) => items).flatMap((val) => val);
    })
    .catch((error) => {
      throw error;
    });
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
    let message = "Added song to queue";
    if (track.name) {
      message = `Added ${track.name} to queue`;
    }
    if (track.uri) {
      addSongToQueue(track.uri, accessToken)
        .then(() => {
          setStatusText(message);
        })
        .catch(handleAsyncError);
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
    setStatusText(null);
  }

  function handleRandomClick() {
    const randomTracks = pickRandomTracks(tracksData ?? []);
    setCurrentTracks(randomTracks);
  }

  function handleAsyncError(error) {
    if (typeof error === "string") setStatusText(error);
    if (error.message && typeof error.message === "string") {
      setStatusText(error.message);
    }
  }

  function addAllSongsToQueue() {
    currentTracks.forEach(({ track }) => {
      if (track.uri) {
        addSongToQueue(track.uri, accessToken)
          .then(() => {
            setStatusText("Added all songs to queue");
          })
          .catch(handleAsyncError);
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
