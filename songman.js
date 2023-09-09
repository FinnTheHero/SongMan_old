require("dotenv").config();

const axios = require("axios");
const NodeID3 = require("node-id3");
const fs = require("fs");
const { google } = require("googleapis");
const readline = require("readline");
const SpotifyWebApi = require("spotify-web-api-node");
const ytdl = require("ytdl-core");
const ffmpeg = require("fluent-ffmpeg");

const spotifyApi = new SpotifyWebApi({
	clientId: process.env.SPOTIFY_CLIENT_ID,
	clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
});

const youtube = google.youtube({
	version: "v3",
	auth: process.env.YOUTUBE_API_KEY,
});

async function main() {
	// Retrieve an access token
	const data = await spotifyApi.clientCredentialsGrant();
	spotifyApi.setAccessToken(data.body["access_token"]);

	const rl = readline.createInterface({
		input: process.stdin,
		output: process.stdout,
	});

	const url = await new Promise((resolve) => {
		rl.question("Enter a Spotify URL: ", (answer) => {
		resolve(validateUrl(answer.trim()));
		rl.close();
		});
	});

	let songs;
	if (url.includes("track")) {
		songs = [await getTrackInfo(url)];
	} else if (url.includes("playlist")) {
		songs = await getPlaylistInfo(url);
	}

	const start = Date.now();
	let downloaded = 0;
	for (let i = 0; i < songs.length; i++) {
		const trackInfo = songs[i];
		const searchQuery = `${trackInfo.artistName} ${trackInfo.trackTitle} audio`;
		const videoUrl = await findYoutube(searchQuery);

		console.log(
		`(${i + 1}/${songs.length}) Downloading '${trackInfo.artistName} - ${
			trackInfo.trackTitle
		}'...`,
		);
		const audioPath = await downloadYt(videoUrl, trackInfo.trackTitle);
		let convertedAudioPath;

		if (audioPath) {
		convertedAudioPath = await convertWebmToMp3(audioPath);
		removeSourceFile(audioPath);
		}

		if (convertedAudioPath) {
		await setMetadata(trackInfo, convertedAudioPath); // Wait for metadata to be set before moving on
		downloaded++;
		} else {
		console.log("File exists. Skipping...");
		}
	}
	const end = Date.now();
	console.log(`Download location: ${process.cwd()}\music`);
	console.log(
		`DOWNLOAD COMPLETED: ${downloaded}/${songs.length} song(s) downloaded`,
	);
	console.log(`Total time taken: ${Math.round((end - start) / 1000)} sec`);
}

function validateUrl(spUrl) {
	if (/^(https?:\/\/)?open\.spotify\.com\/(playlist|track)\/.+$/.test(spUrl)) {
		return spUrl;
	}
	throw new Error("Invalid Spotify URL");
}

async function getAlbumInfo(albumId) {
	const album = await spotifyApi.getAlbum(albumId);
	return album.body;
}


async function getTrackInfo(trackUrl) {
	const res = await spotifyApi.getTrack(trackUrl.split("/").pop());
	const track = res.body;

	const album = await getAlbumInfo(track.album.id);
	const albumGenre = album.genres && album.genres.length > 0 ? album.genres[0] : 'Unknown';

	return {
		albumGenre: albumGenre,
		artistName: track.artists[0].name,
		trackTitle: track.name,
		trackNumber: track.track_number,
		isrc: track.external_ids.isrc,
		albumArt: track.album.images[1].url,
		albumName: track.album.name,
		albumArtist: album.artists[0].name,
		releaseDate: track.album.release_date,
		artists: track.artists.map((artist) => artist.name),
	};
}

async function getPlaylistInfo(playlistUrl) {
	const res = await spotifyApi.getPlaylist(playlistUrl.split("/").pop());
	const playlist = res.body;

	if (!playlist.public) {
		throw new Error(
		"Can't download private playlists. Change your playlist's state to public.",
		);
	}

	const tracks = playlist.tracks.items.map((item) => item.track);
	const tracksInfo = [];
	for (let i = 0; i < tracks.length; i++) {
		const trackUrl = `https://open.spotify.com/track/${tracks[i].id}`;
		const trackInfo = await getTrackInfo(trackUrl);
		tracksInfo.push(trackInfo);
	}

	return tracksInfo;
}

async function findYoutube(query) {
	// Use the YouTube Data API to search for a video matching the query
	// Return the URL of the first matching video
	const res = await youtube.search.list({
		part: "id",
		type: "video",
		q: query,
		maxResults: 1,
	});
	const videoId = res.data.items[0].id.videoId;
	return `https://www.youtube.com/watch?v=${videoId}`;
}

async function downloadYt(videoUrl, trackTitle) {
	// Use the ytdl-core library to download the audio from the video
	// Save the audio file to a specified location and return the file path
	//const videoId = new URL(videoUrl).searchParams.get("v");
	const audioPath = `./music/${trackTitle}`;

	if (fs.existsSync(audioPath + ".mp3")) { // Checking if the converted file exists because the source will be deleted after conversion
		return null; // File already exists, skip download
	}

	await new Promise(async (resolve, reject) => {
		ytdl(videoUrl, { filter: "audioonly" })
		.pipe(fs.createWriteStream(audioPath))
		.on("finish", resolve)
		.on("error", reject);
	});

	return audioPath;
	}

async function convertWebmToMp3(audioPath) {
	const newPath = audioPath + ".mp3";

	const splitPath = audioPath.split("/")
	
	const songname = splitPath[splitPath.length - 1]
	
	console.log("Processing - " + songname );
	
	let prog;
	
	return new Promise((res, rej) =>
		ffmpeg(audioPath)
		.toFormat("mp3")
		.on("error", (err) => {
			console.log("An error has occurred: " + err.message);
			rej(err.message);
		})
		.on("progress", (progress) => {
			// console.log(JSON.stringify(progress));
			//console.log("Processing: " + progress.targetSize + " KB converted");
			prog = progress.targetSize;
		})
		.on("end", () => {
			console.log("Finished - " + prog + " KB converted");
			res(newPath);
		})
		.save(newPath),
  );
}

function removeSourceFile(audioPath) {
  	fs.rm(audioPath, { recursive: false }, (err) => {
		if (err) {
		console.log(err.message);
		return;
		}

    	console.log("Source file deleted successfully");
  	});
}

async function setMetadata(trackInfo, audioPath) {
	// Fetch the album art and convert it to a buffer
	let imageBuffer = null;
	try {
		const response = await axios.get(trackInfo.albumArt, {
		responseType: "arraybuffer",
		});
		imageBuffer = Buffer.from(response.data, "binary");
	} catch (err) {
		console.log("Error fetching album art:", err);
		return; // If you can't get the image, you might decide to return and skip setting metadata.
	}

  const tags = {
    genre: trackInfo.artistGenre,
    title: trackInfo.trackTitle,
    artist: trackInfo.artistName,
	performerInfo: trackInfo.artistName,
    album: trackInfo.albumName,
    trackNumber: trackInfo.trackNumber,
    year: trackInfo.releaseDate.split("-")[0], // Assuming releaseDate is in YYYY-MM-DD format
    image: {
		mime: "image/jpeg",
		type: {
			id: 3,
			name: "front cover",
		},
		description: "Album cover",
		imageBuffer: imageBuffer,
		},
	};

  	const success = NodeID3.write(tags, audioPath);
	if (success) {
		console.log("Successfully set metadata");
	} else {
		console.log("Error setting metadata");
		const error = NodeID3.write(tags, audioPath, function (err) {
		return err;
		});
		console.log("Error details:", error);
  	}
}

main();
