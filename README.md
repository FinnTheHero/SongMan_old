# Experimental Music Transformation Project

## Overview

This is an experimental project developed for educational purposes only. It is designed to showcase the integration of multiple APIs and the transformation of music files. Please note that this project is not intended for any unethical or illegal use, and it should only be used with the explicit consent of the authors and in compliance with all relevant laws and policies.

## Project Description

This project is written in JavaScript and utilizes the Spotify API and Google's YouTube API (googleapis) to perform the following tasks:

1. **Spotify API Integration**: It accesses the Spotify API to retrieve information about either a single track or an entire public playlist.

2. **YouTube API Integration**: Using the information obtained from Spotify, it searches for the corresponding song on YouTube using the YouTube API.

3. **Music Download**: It downloads the song from YouTube in webm format using the `ytdl-core` package.

4. **Format Transformation**: The webm format is then transformed into mp3 format.

5. **Metadata Enrichment**: Metadata for the downloaded song is enriched using ffmpeg, fluent-ffmpeg package and information obtained from Spotify (e.g., song name, author).

6. **Cleanup**: The old webm format file is deleted to save space.

Please note that this project requires three API keys to function correctly:

- YouTube API Key
- Spotify Client ID
- Spotify Client Secret

These API keys should be stored in a `.env` file within the project directory.

Project also requires ffmpeg to be installed and added to system enviromental variables PATH

## Installation

To run this project, follow these steps ( Assuming you already have ffmpeg installed ):

1. Download this project and navigate to its directory using the command line:
   ```powershell
   git clone https://github.com/FinnTheHero/songman.git
   ```

   ```powershell
   cd songman
   ```

2. Create a `.env` file in the project directory with the required API credentials.

3. Create directory called `music`:
   ```powershell
   mkdir music
   ```
   all of the downloaded/converted audio files will be stored here

4. Run the code using the appropriate command.

You can install ffmpeg from following [guide](https://www.geeksforgeeks.org/how-to-install-ffmpeg-on-windows/)

## Project Status

This project is still in development, and certain features are not yet fully implemented. Future updates may include improvements to metadata handling and other enhancements.

## Disclaimer

This project is strictly for experimental purposes and should not be used for any unethical, illegal, or unauthorized activities. Users are responsible for adhering to all laws and policies governing the use of APIs and copyrighted content. The developer does not take any responsibility for the misuse of this project.