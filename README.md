# Pomo Doll 🌱

A full fledged customizable Pomodoro App that includes project tracking features, detailed statistics, and a free timer mode.

You can either download the Desktop App **(Recommended)** or use it in the browser  

![Version](https://img.shields.io/badge/version-1.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)

## Features

- 🍅 **Traditional Pomodoro Timer** - Customizable work/break intervals
- ⏱️ **Free Timer Mode** - Flexible time tracking without fixed intervals
- 📊 **Detailed Statistics** - GitHub-style heatmap and trend charts
- 📁 **Project Tracking** - Track time spent on different projects with goals
- 🌙 **Dark/Light Theme** - Easy on the eyes, day or night
- 🖼️ **Customizable Covers** - Choose from 3 default covers or upload your own
- 💾 **Data Export/Import** - Backup and restore your data easily
- 🔔 **Audio Alerts** - Sound notifications for completed sessions

## Screenshots & Features

### Default Covers - You can upload your own as well.
<div>
<img src="https://i.imgur.com/xX40ISy.png" alt="Description of image" style="max-width:50%;height:50%;">
  -
<img src="https://i.imgur.com/R3qc18G.png" alt="Description of image" style="max-width:50%;height:50%;">
  -
<img src="https://i.imgur.com/NO0kpKv.png" alt="Description of image" style="max-width:50%;height:50%;">

</div>

### Normal Pomodoro & Free Timer mode 
Pomodoro mode tracks a countdown from a determined period (25) meanwhile Free Timer mode is... until you decide to take a break.

<img src="https://i.imgur.com/OzThAQj.jpeg" alt="Description of image" style="max-width:50%;height:50%;">

### Upload your own cover
<img src="https://i.imgur.com/oNQAHxa.jpeg" alt="Description of image" style="max-width:50%;height:50%;">

### More personalization

<img src="https://i.imgur.com/KfG9DFS.jpeg" alt="Description of image" style="max-width:50%;height:50%;">

## Download

Download the latest release for your platform:

- **Windows**: [Download .exe](https://github.com/Chino-chan/Pomo-Doll/releases)
- **macOS**: [Download .dmg](https://github.com/Chino-chan/Pomo-Doll/releases)
- **Linux**: [Download .AppImage](https://github.com/Chino-chan/Pomo-Doll/releases)

## Installation for Developers

Requirements:
- Node.js 16+
- npm

```bash
# Clone the repository
git clone https://github.com/your-username/pomo-doll.git
cd pomo-doll

# Install dependencies
npm install

# Run the app
npm start

# Build for production
npm run build
```

## Usage

### Basic Timer
1. Click the **Play** button to start a Pomodoro session
2. Work until the timer completes
3. Take a break when prompted
4. After 4 cycles, enjoy a long break!

### Project Tracking
1. Go to **Config** tab
2. Add a new project with a name and goal (in hours)
3. Click **Track this!** to start tracking time for that project
4. Your study time will be automatically attributed to the active project

### Statistics
- Click **Full Stats** to view your detailed statistics
- See your study streak, heatmap, and trends over time
- View project distribution pie charts
- Check your personal records


## Data Management

All your data is stored **locally** on your computer or browser if you run it there. 

## Development

```bash
# Run in development mode
npm start

# Run tests
npm test

# Run tests with UI
npm run test:ui

# Run tests with coverage
npm run test:coverage

# Build for all platforms
npm run build
```

## Stack

- **Electron** - Desktop app framework
- **Vanilla JavaScript** - No frameworks, pure JS insanity
- **HTML5 Canvas** - Charts and visualizations
- **Vitest** - Testing framework
- **localStorage** - Data persistence (Both Desktop & Browser)
- **Claude Code** - Documentation, Testing coverage, and more 

## Please feel free to

- Report bugs
- Suggest new features
- Give overall feedback

## License

MIT License - see [LICENSE](LICENSE) file for details

## Author

Created by me, I hope you enjoy it. I created this because I saw most other Pomodoro/Study apps lacked something I wanted. 



