import { useEffect, useState } from "react";
import Tracks from "./tracks";

const scopes =
  "app-remote-control streaming user-library-read playlist-read-private playlist-read-collaborative user-read-recently-played user-top-read user-read-playback-position user-read-playback-state user-read-currently-playing user-modify-playback-state user-read-email user-read-private";

function getHashParams() {
  var hashParams = {};
  var e,
    r = /([^&;=]+)=?([^&;]*)/g,
    q = window.location.hash.substring(1);
  while ((e = r.exec(q))) {
    hashParams[e[1]] = decodeURIComponent(e[2]);
  }
  return hashParams;
}

export default function Login() {
  const params = getHashParams();
  const { access_token: accessToken } = params;

  function handleLoginClick() {
    const location = window.location;
    const redirectUri = location.origin + location.pathname;
    let url = "https://accounts.spotify.com/authorize";
    url += "?response_type=token";
    url +=
      "&client_id=" + encodeURIComponent("02f06d496f444e22b84e831789b992c3");
    url += "&scope=" + encodeURIComponent(scopes);
    url += "&redirect_uri=" + encodeURIComponent(redirectUri);
    window.location = url;
  }

  if (accessToken) {
    return <Tracks accessToken={accessToken} />;
  }

  return (
    <div className="login_page">
      <button onClick={handleLoginClick}>Log in with Spotify</button>
    </div>
  );
}
