   # Nutrition Logger

   ## Overview

   **Nutrition Logger** is a Node.js command-line script that allows users to log meals, analyze images of food using the Google Cloud Vision API, and estimate nutritional information (calories, protein, fat, carbs, fiber, sugar, and sodium) using the Edamam Nutrition Analysis API. The script supports logging new meals and editing existing ones, with features to update meal details via chat (e.g., "I also had a diet Mountain Dew" or "I only ate 1/2 of my potatoes") or by uploading new images to reanalyze or compare for remaining calories.

   The project is currently in a functional state as a command-line tool, with plans to evolve it into a basic iPhone app in the future. The script is designed to run on macOS (tested on macOS Sequoia) and uses Node.js `v23.9.0`.

   ## Current Features

   - **Log a New Meal**:
     - Users can log a new meal by providing the path to an image file and entering a description.
     - The script uses the Google Cloud Vision API to analyze the image and identify food items.
     - The Edamam Nutrition Analysis API estimates nutritional information based on the identified food items and description.
     - Meals are logged to a JSON file (`nutrition/nutrition-log.json`) in the project directory.
   - **Edit an Existing Meal**:
     - Users can select a previously logged meal to edit.
     - Options include:
       - **Upload a new image**: Reanalyze the meal with a new image and update the nutritional information.
       - **Update details via chat**:
         - Add new items (e.g., "I also had a diet Mountain Dew").
         - Adjust portions (e.g., "I only ate 1/2 of my potatoes") to update the calories.
       - **Compare a new image to estimate remaining calories**: Compare a new image of the remaining food to estimate the portion consumed and adjust the net calories.
     - Edits are tracked in a `history` field in the log entry.
   - **File Selection**:
     - The script currently prompts users to manually enter the file path to an image. A previous attempt to use a graphical file chooser (`open` package) and a terminal-based file selector (`inquirer-file-path`) was abandoned due to compatibility issues and security vulnerabilities, respectively.

   ## Project Structure

   ```
   /Users/evanthayer/Projects/nutrition_logger/
   ├── nutrition/                    # Directory for storing the log file
   │   └── nutrition-log.json        # JSON file storing logged meals
   ├── node_modules/                 # Node.js dependencies
   ├── package-lock.json             # Dependency lock file
   ├── package.json                  # Project metadata and dependencies
   ├── nutrition-logger.js           # Main script
   ├── vision-api-key.json           # Service account key for Google Cloud Vision API (not committed to Git)
   ├── .gitignore                    # Git ignore file (excludes node_modules, .env, and vision-api-key.json)
   └── README.md                     # This file
   ```

   ## Prerequisites

   - **Node.js**: Version `v23.9.0` (tested on macOS Sequoia).
   - **Google Cloud Project**:
     - A Google Cloud project (`nutritionlogger`, project ID: `nutritionlogger`, project number: `1073914349071`).
     - The Cloud Vision API must be enabled for the project.
     - A service account (`vision-api-service-account@nutritionlogger.iam.gserviceaccount.com`) is created, and a key file (`vision-api-key.json`) is used for authentication.
     - Note: The organization policy `constraints/iam.disableServiceAccountKeyCreation` initially prevented key creation, but this was resolved by temporarily disabling the policy for the project.
   - **Edamam API Credentials**:
     - An Edamam Nutrition Analysis API account with an app ID and app key.
     - Credentials should be stored in a `.env` file in the project root (not committed to Git for security reasons).

   ## Setup

   ### 1. Clone the Repository
   ```bash
   git clone https://github.com/goodbetterbestco/nutrition_logger.git
   cd nutrition_logger
   ```

   ### 2. Install Dependencies
   Install the required Node.js packages:
   ```bash
   npm install
   ```

   The `package.json` includes the following dependencies:
   - `"@google-cloud/vision": "^5.1.0"` - For image analysis using the Google Cloud Vision API.
   - `"axios": "^1.8.4"` - For making HTTP requests to the Edamam API.
   - `"dotenv": "^16.4.7"` - For loading environment variables from a `.env` file.
   - `"inquirer": "^8.2.6"` - For interactive command-line prompts.

   ### 3. Set Up Google Cloud Authentication
   The script uses the Google Cloud Vision API, which requires authentication via a service account key.

   1. **Place the Service Account Key**:
      - Ensure the `vision-api-key.json` file (downloaded from the Google Cloud Console) is in the project root (`/Users/evanthayer/Projects/nutrition_logger/vision-api-key.json`).
      - The `GOOGLE_APPLICATION_CREDENTIALS` environment variable should point to this file:
        ```bash
        export GOOGLE_APPLICATION_CREDENTIALS="/Users/evanthayer/Projects/nutrition_logger/vision-api-key.json"
        ```
      - Add this to your `~/.zshrc` to make it persistent:
        ```bash
        echo 'export GOOGLE_APPLICATION_CREDENTIALS="/Users/evanthayer/Projects/nutrition_logger/vision-api-key.json"' >> ~/.zshrc
        source ~/.zshrc
        ```

   2. **Ensure the Cloud Vision API Is Enabled**:
      ```bash
      gcloud services enable vision.googleapis.com --project=nutritionlogger
      ```

   3. **Grant Permissions (if needed)**:
      Ensure your user account has sufficient permissions to manage the project:
      ```bash
      gcloud projects add-iam-policy-binding nutritionlogger \
        --member=user:your-email@domain.com \
        --role=roles/owner
      ```
      Replace `your-email@domain.com` with your Google Cloud account email (e.g., `evan@goodbetter.best`).

   ### 4. Set Up Edamam API Credentials
   Create a `.env` file in the project root with your Edamam API credentials:
   ```bash
   echo "EDAMAM_APP_ID=your_edamam_app_id" >> .env
   echo "EDAMAM_APP_KEY=your_edamam_app_key" >> .env
   ```
   Replace `your_edamam_app_id` and `your_edamam_app_key` with your actual Edamam API credentials. Do not commit the `.env` file to Git (it’s excluded by `.gitignore`).

   ### 5. Run the Script
   ```bash
   node nutrition-logger.js
   ```

   ## Usage

   The script provides a command-line interface with two main options:

   ### Log a New Meal
   1. Select "Log a new meal" from the menu.
   2. Enter the path to your image file (e.g., `/Users/evanthayer/Projects/IMG_2892.jpg`).
   3. Enter a description of the meal (e.g., `Ranchero Breakfast Burrito from Stacks: Flour tortilla filled with scrambled eggs, onions, tomatoes, bell peppers and avocado, topped with melted cheddar-jack cheese, queso fresco, chipotle salsa, with potatoes on the side`).
   4. The script will:
      - Analyze the image using the Google Cloud Vision API to identify food items.
      - Estimate nutritional information using the Edamam Nutrition Analysis API.
      - Log the meal to `nutrition/nutrition-log.json`.
      - Display the nutritional breakdown.

   ### Edit an Existing Meal
   1. Select "Edit an existing meal" from the menu.
   2. Choose a meal from the list of logged meals.
   3. Select an edit option:
      - **Upload a new image**: Reanalyze the meal with a new image.
      - **Update details via chat**:
        - Add new items (e.g., "I also had a diet Mountain Dew").
        - Adjust portions (e.g., "I only ate 1/2 of my potatoes").
      - **Compare a new image to estimate remaining calories**: Compare a new image to estimate the remaining portion and adjust net calories.
   4. The script will update the meal in `nutrition/nutrition-log.json` and log the edit in the `history` field.

   ## Log File Structure

   The `nutrition/nutrition-log.json` file stores logged meals in the following format:

   ```json
   [
     {
       "date": "2025-03-21T18:11:14.268Z",
       "description": "Ranchero Breakfast Burrito from Stacks: Flour tortilla filled with scrambled eggs, onions, tomatoes, bell peppers and avocado, topped with melted cheddar-jack cheese, queso fresco, chipotle salsa, with potatoes on the side, diet Mountain Dew",
       "estimatedCalories": 1094,
       "foodItems": ["burrito", "potatoes", "diet mountain dew"],
       "nutritionDetails": {
         "calories": 1094,
         "protein": 30.2,
         "fat": 40.5,
         "carbs": 90.3,
         "fiber": 10.1,
         "sugar": 5.4,
         "sodium": 1200.7
       },
       "imagePath": "/users/evanthayer/Projects/IMG_2892.jpg",
       "history": [
         {
           "date": "2025-03-21T20:00:00.000Z",
           "action": "Added item",
           "newItem": "diet mountain dew",
           "additionalCalories": 0
         },
         {
           "date": "2025-03-21T20:05:00.000Z",
           "action": "Adjusted portion of potatoes",
           "fraction": 0.5,
           "originalCalories": 1094,
           "newCalories": 547
         }
       ]
     }
   ]
   ```

   ## Known Issues and Limitations

   - **File Selection**:
     - The script currently requires manual entry of file paths due to issues with graphical file choosers (`open` package) and terminal-based file selectors (`inquirer-file-path`). The `open` package failed to present a proper file chooser dialog on macOS Sequoia, and `inquirer-file-path` introduced security vulnerabilities due to an outdated `lodash` dependency.
     - A future improvement could involve implementing a reliable file selection method, such as using a native macOS dialog via a package like `dialog` or integrating with Electron for a GUI.
   - **Service Account Key Creation**:
     - The organization policy `constraints/iam.disableServiceAccountKeyCreation` initially prevented creating a service account key for `vision-api-service-account@nutritionlogger.iam.gserviceaccount.com`. This was resolved by temporarily disabling the policy for the project.
     - For production use, consider using Workload Identity or a different authentication method to avoid relying on service account keys.
   - **Command-Line Interface**:
     - The script is currently a command-line tool, which is functional but not user-friendly for a broader audience. The next step is to turn it into a basic iPhone app, which will require a complete rewrite using Swift or a cross-platform framework like React Native.

   ## Next Steps for Development

   ### Short-Term Improvements
   1. **Enhance File Selection**:
      - Explore alternative file selection solutions for macOS, such as:
        - Using `dialog` (requires installing `dialog` via Homebrew: `brew install dialog`).
        - Integrating with Electron to create a simple GUI for file selection.
      - Alternatively, improve the user experience by providing better prompts or default paths for manual file entry.
   2. **Improve Error Handling**:
      - Add more robust error handling for network issues with the Google Cloud Vision API and Edamam API.
      - Provide better feedback to the user if API calls fail (e.g., retry logic, fallback to manual input).
   3. **Add Input Validation**:
      - Validate image file paths to ensure they exist and are accessible before attempting to analyze them.
      - Validate user input for chat updates to handle more complex scenarios (e.g., "I ate 2 slices of pizza").

   ### Long-Term Goal: iPhone App
   The ultimate goal is to turn this script into a basic iPhone app. Here are the high-level steps to achieve this:

   1. **Choose a Development Framework**:
      - **Swift/SwiftUI**: Use Swift and SwiftUI to build a native iOS app. This provides the best performance and user experience but requires learning Swift.
      - **React Native**: Use React Native to build a cross-platform app (iOS and Android). This leverages your existing JavaScript knowledge but may have performance trade-offs.
      - **Flutter**: Use Flutter with Dart for another cross-platform option. Flutter offers a good balance of performance and development speed.

   2. **Design the App**:
      - **Home Screen**: Display a list of logged meals with options to add a new meal or edit an existing one.
      - **Add Meal Screen**:
        - Allow users to take a photo or select an image from their photo library.
        - Provide a text field for entering a meal description.
        - Display the nutritional breakdown after analysis.
      - **Edit Meal Screen**:
        - Allow users to update the image, add new items via text, or compare a new image for remaining calories.
      - **Log Storage**: Store meals in a local database (e.g., SQLite) or sync with a backend (e.g., Firebase).

   3. **Integrate APIs**:
      - **Google Cloud Vision API**: Use the Vision API to analyze images. You’ll need to authenticate using a service account or OAuth 2.0 (since key creation is disabled by default in the organization).
      - **Edamam API**: Use the Edamam Nutrition Analysis API to estimate nutritional information. Store the API credentials securely (e.g., in the app’s keychain or a backend).

   4. **Backend (Optional)**:
      - Consider adding a backend (e.g., Firebase, AWS Amplify, or a custom Node.js server) to store meal logs and sync across devices.
      - Use Firebase Authentication for user accounts and Firestore for data storage.

   5. **Test and Deploy**:
      - Test the app on a simulator and a physical iPhone.
      - Deploy to TestFlight for beta testing.
      - Submit to the App Store for public release.

   ## Development Environment

   - **OS**: macOS Sequoia
   - **Node.js**: v23.9.0
   - **Editor**: Any text editor (e.g., `nano`, VS Code)
   - **Dependencies**:
     - `@google-cloud/vision`: ^5.1.0
     - `axios`: ^1.8.4
     - `dotenv`: ^16.4.7
     - `inquirer`: ^8.2.6

   ## Contributing

   To contribute to this project:
   1. Fork the repository.
   2. Create a new branch (`git checkout -b feature/your-feature`).
   3. Make your changes and commit (`git commit -m "Add your feature"`).
   4. Push to your branch (`git push origin feature/your-feature`).
   5. Create a pull request on GitHub.

   ## License

   This project is licensed under the MIT License. See the LICENSE file for details (to be added).

   ## Contact

   For questions or support, contact Evan Thayer at `evan@goodbetter.best`.
