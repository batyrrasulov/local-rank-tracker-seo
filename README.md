# Local Rank Tracker

**Local Rank Tracker** is a local rank tracking platform designed to help businesses optimize their visibility on Google Maps and local search results. It enables users to analyze how their business ranks for specific keywords across a geographic grid, providing clear visualizations of rankings at different locations. 

With features like customizable grid sizes, keyword-based searches, and real-time data, this tool is aimed at helping businesses identify opportunities to improve their local SEO performance. Whether you're a small business owner or a marketing agency, **Local Rank Tracker** makes it easy to monitor and boost local search rankings, giving you a competitive edge in your area.

## Features

- **Keyword-based Ranking**: Track your business's local search ranking for specific keywords.
- **Grid-based Visualization**: Analyze rankings across a customizable geographic grid for better insight.
- **Real-time Data**: Get real-time updates of your business rankings across multiple locations.
- **Customizable Grid Size**: Choose from different grid sizes (3x3, 5x5, etc.) to tailor your search results.
- **Google Maps Integration**: The platform integrates seamlessly with Google Maps to provide location-based results.
- **Business Rank Report**: Generate a ranked report for businesses in the grid, showing ranking positions and detailed business info.
- **Local SEO Optimization**: Helps identify opportunities for improving local SEO performance.

## Technologies Used

- **Backend**: Node.js, Express
- **Frontend**: JavaScript, HTML, CSS
- **API Integration**: Google Maps API, Google Places API, MongoDB
- **Database**: MongoDB (for storing user preferences and search results)
- **Hosting/Cloud**: Google Cloud (for handling API requests and map services)

## Setup Instructions

1. **Clone the Repository**:

   ```bash
   git clone https://github.com/your-username/local-rank-tracker.git
   cd local-rank-tracker
   ```

2. **Install Dependencies**:

   Run the following command to install the necessary dependencies:

   ```bash
   npm install
   ```

3. **Set up Google Cloud API**:

   - Create a project in [Google Cloud Console](https://console.cloud.google.com/).
   - Enable the **Google Places API** and **Google Maps JavaScript API**.
   - Generate an API key and place it in a `.env` file (ensure it's not exposed in the public repo).

4. **Configure MongoDB**:

   - Set up a MongoDB database (either locally or via a cloud provider).
   - Configure the MongoDB connection in the backend.

5. **Run the Application**:

   ```bash
   npm start
   ```

   This will start the backend server on `http://localhost:3000`.

6. **Access the Application**:

   Open the frontend in a web browser by navigating to the provided URL after starting the backend.


## Usage

1. **Run Search**: 
   - Enter the business name, keyword, radius, and grid size to run a search.
   - View the results on the map, with grid points showing the ranking of your business.
   
2. **View Rankings**: 
   - The app will display a list of businesses ranked according to their position on the map.

3. **Reset Search**: 
   - Click the "Reset" button to clear the grid and reset the search.

## How It Works

1. **Business Search**:
   The app uses Google Places API to find the business based on the user’s input. It centers the map on that business.

2. **Rank Generation**:
   Once the grid and keyword parameters are set, the app uses Google’s Nearby Search API to fetch businesses within the grid and ranks them based on their position in the search results.

3. **Grid-Based Ranking**:
   The app generates a grid of points around the business, with businesses ranked at each point based on how they appear in the search results. These rankings are displayed both on the map and in a list format.

4. **Real-Time Data**:
   The rankings are fetched in real-time, providing up-to-date information on your business's position in the local search results.

## Demo
**Demo Video:** [Click Here](https://1drv.ms/v/c/b29dbbf12dfc7458/EdFkClfDWJtAsgw26DBuXuUBi2Pz6_RPD_QBD7ASlLzXjw?e=n57qSN)
