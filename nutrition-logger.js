const fs = require('fs').promises;
const path = require('path');
const readline = require('readline').createInterface({
  input: process.stdin,
  output: process.stdout,
});
const axios = require('axios');
const inquirer = require('inquirer');
require('dotenv').config();

// Directory and log file paths
const NUTRITION_DIR = path.join(__dirname, 'nutrition');
const LOG_FILE = path.join(NUTRITION_DIR, 'nutrition-log.json');

// Edamam API credentials from .env
const EDAMAM_APP_ID = process.env.EDAMAM_APP_ID;
const EDAMAM_APP_KEY = process.env.EDAMAM_APP_KEY;

// Function to initialize Google Cloud Vision client
async function initializeVisionClient() {
  try {
    const vision = await import('@google-cloud/vision');
    const visionClient = new vision.ImageAnnotatorClient();
    // Test the client to ensure it initializes correctly
    await visionClient.getProjectId(); // This will throw an error if authentication fails
    return visionClient;
  } catch (err) {
    console.error('Failed to initialize Google Cloud Vision client:', err.message);
    throw err;
  }
}

// Function to prompt user for input
const prompt = (question) =>
  new Promise((resolve) => readline.question(question, resolve));

// Function to create the nutrition directory if it doesn't exist
async function ensureNutritionDir() {
  try {
    await fs.mkdir(NUTRITION_DIR, { recursive: true });
  } catch (err) {
    console.error('Error creating nutrition directory:', err.message);
    process.exit(1);
  }
}

// Function to read the existing log file, or initialize it if it doesn't exist
async function readLogFile() {
  try {
    const data = await fs.readFile(LOG_FILE, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    if (err.code === 'ENOENT') {
      return [];
    }
    console.error('Error reading log file:', err.message);
    process.exit(1);
  }
}

// Function to write to the log file
async function writeLogFile(entries) {
  try {
    await fs.writeFile(LOG_FILE, JSON.stringify(entries, null, 2));
  } catch (err) {
    console.error('Error writing to log file:', err.message);
    process.exit(1);
  }
}

// Function to select an image (manual input)
async function selectImage() {
  try {
    return await prompt('Enter the path to the image of your meal: ');
  } catch (err) {
    console.error('Error selecting image:', err.message);
    process.exit(1);
  }
}

// Function to analyze the image using Google Cloud Vision API
async function analyzeImage(imagePath) {
  try {
    const visionClient = await initializeVisionClient();
    const [result] = await visionClient.labelDetection(imagePath);
    const labels = result.labelAnnotations.map((label) => ({
      description: label.description,
      score: label.score,
    }));
    return labels.filter((label) => label.score > 0.7);
  } catch (err) {
    console.error('Error analyzing image with Google Cloud Vision:', err.message);
    return [];
  }
}

// Function to estimate calories using Edamam Nutrition Analysis API
async function estimateCalories(foodItems) {
  try {
    const ingr = foodItems.map((item) => `1 ${item}`);
    const response = await axios.post(
      `https://api.edamam.com/api/nutrition-data?app_id=${EDAMAM_APP_ID}&app_key=${EDAMAM_APP_KEY}`,
      { ingr },
      { headers: { 'Content-Type': 'application/json' } }
    );

    const data = response.data;
    const totalCalories = data.calories || 0;
    const nutrients = data.totalNutrients || {};
    return {
      calories: totalCalories,
      protein: nutrients.PROCNT?.quantity || 0,
      fat: nutrients.FAT?.quantity || 0,
      carbs: nutrients.CHOCDF?.quantity || 0,
      fiber: nutrients.FIBTG?.quantity || 0,
      sugar: nutrients.SUGAR?.quantity || 0,
      sodium: nutrients.NA?.quantity || 0,
    };
  } catch (err) {
    console.error('Error estimating calories with Edamam API:', err.message);
    return { calories: 0, protein: 0, fat: 0, carbs: 0, fiber: 0, sugar: 0, sodium: 0 };
  }
}

// Function to analyze the meal
async function analyzeMeal(description, imagePath) {
  const labels = await analyzeImage(imagePath);
  const foodItemsFromImage = labels
    .map((label) => label.description.toLowerCase())
    .filter((desc) =>
      desc.includes('food') || desc.includes('burrito') || desc.includes('potato') || desc.includes('salsa') || desc.includes('cheese') || desc.includes('avocado')
    );

  const descriptionItems = description.toLowerCase().split(',').map((item) => item.trim());
  const foodItems = [...new Set([...foodItemsFromImage, ...descriptionItems])];

  const nutritionDetails = await estimateCalories(foodItems);

  let response = `I analyzed your meal: ${description}\n`;
  response += `Based on the image and description, I identified the following food items: ${foodItems.join(', ') || 'none detected'}.\n`;
  response += `Estimated nutritional breakdown:\n`;
  response += `- Calories: ${nutritionDetails.calories} kcal\n`;
  response += `- Protein: ${nutritionDetails.protein.toFixed(1)} g\n`;
  response += `- Fat: ${nutritionDetails.fat.toFixed(1)} g\n`;
  response += `- Carbs: ${nutritionDetails.carbs.toFixed(1)} g\n`;
  response += `- Fiber: ${nutritionDetails.fiber.toFixed(1)} g\n`;
  response += `- Sugar: ${nutritionDetails.sugar.toFixed(1)} g\n`;
  response += `- Sodium: ${nutritionDetails.sodium.toFixed(1)} mg\n`;

  return { estimatedCalories: nutritionDetails.calories, nutritionDetails, foodItems, response };
}

// Function to edit a meal
async function editMeal(entries) {
  if (entries.length === 0) {
    console.log('No meals to edit.');
    return entries;
  }

  const choices = entries.map((entry, index) => ({
    name: `${index + 1}. ${entry.description} (${entry.date})`,
    value: index,
  }));

  const { mealIndex } = await inquirer.prompt([
    {
      type: 'list',
      name: 'mealIndex',
      message: 'Select a meal to edit:',
      choices,
    },
  ]);

  const meal = entries[mealIndex];
  console.log('Current meal details:', meal);

  const { editOption } = await inquirer.prompt([
    {
      type: 'list',
      name: 'editOption',
      message: 'How would you like to edit this meal?',
      choices: [
        'Upload a new image',
        'Update details via chat',
        'Compare a new image to estimate remaining calories',
      ],
    },
  ]);

  let updatedMeal = { ...meal, history: meal.history || [] };

  if (editOption === 'Upload a new image') {
    const newImagePath = await selectImage();
    const { estimatedCalories, nutritionDetails, foodItems, response } = await analyzeMeal(meal.description, newImagePath);
    updatedMeal.imagePath = newImagePath;
    updatedMeal.estimatedCalories = estimatedCalories;
    updatedMeal.nutritionDetails = nutritionDetails;
    updatedMeal.foodItems = foodItems;
    updatedMeal.history.push({
      date: new Date().toISOString(),
      action: 'Updated image',
      newImagePath,
      newCalories: estimatedCalories,
    });
    console.log(response);

  } else if (editOption === 'Update details via chat') {
    const update = await prompt('Enter your update (e.g., "I also had a diet Mountain Dew" or "I only ate 1/2 of my potatoes"): ');
    let additionalCalories = 0;
    let calorieAdjustment = 1;

    // Parse the update
    if (update.toLowerCase().includes('also had')) {
      const newItem = update.toLowerCase().split('also had')[1].trim();
      const nutritionDetails = await estimateCalories([newItem]);
      additionalCalories = nutritionDetails.calories;
      updatedMeal.description += `, ${newItem}`;
      updatedMeal.estimatedCalories += additionalCalories;
      updatedMeal.history.push({
        date: new Date().toISOString(),
        action: 'Added item',
        newItem,
        additionalCalories,
      });
      console.log(`Added ${newItem} with ${additionalCalories} calories. New total: ${updatedMeal.estimatedCalories} kcal.`);

    } else if (update.toLowerCase().includes('only ate')) {
      const match = update.match(/only ate (\d+\/\d+) of my (\w+)/i);
      if (match) {
        const fraction = eval(match[1]); // e.g., 1/2 = 0.5
        const item = match[2].toLowerCase();
        if (updatedMeal.description.toLowerCase().includes(item)) {
          calorieAdjustment = fraction;
          const originalCalories = updatedMeal.estimatedCalories;
          updatedMeal.estimatedCalories = Math.round(originalCalories * fraction);
          updatedMeal.history.push({
            date: new Date().toISOString(),
            action: `Adjusted portion of ${item}`,
            fraction,
            originalCalories,
            newCalories: updatedMeal.estimatedCalories,
          });
          console.log(`Adjusted ${item} to ${fraction * 100}% of original. New total: ${updatedMeal.estimatedCalories} kcal.`);
        } else {
          console.log(`Item "${item}" not found in meal description.`);
        }
      } else {
        console.log('Could not parse portion adjustment. Please use format like "I only ate 1/2 of my potatoes".');
      }
    }

  } else if (editOption === 'Compare a new image to estimate remaining calories') {
    const newImagePath = await selectImage();
    const originalLabels = await analyzeImage(meal.imagePath);
    const newLabels = await analyzeImage(newImagePath);

    // Simple heuristic: Compare the number of food items detected
    const originalFoodCount = originalLabels.length;
    const newFoodCount = newLabels.length;
    const remainingFraction = newFoodCount / (originalFoodCount || 1); // Avoid division by zero
    const originalCalories = meal.estimatedCalories;
    const netCalories = Math.round(originalCalories * remainingFraction);

    updatedMeal.estimatedCalories = netCalories;
    updatedMeal.history.push({
      date: new Date().toISOString(),
      action: 'Compared new image for remaining calories',
      newImagePath,
      originalCalories,
      remainingFraction,
      netCalories,
    });
    console.log(`Estimated remaining portion: ${remainingFraction * 100}%. Net calories: ${netCalories} kcal.`);
  }

  entries[mealIndex] = updatedMeal;
  return entries;
}

// Main function to run the script
async function main() {
  try {
    await ensureNutritionDir();
    let entries = await readLogFile();

    const { action } = await inquirer.prompt([
      {
        type: 'list',
        name: 'action',
        message: 'What would you like to do?',
        choices: ['Log a new meal', 'Edit an existing meal'],
      },
    ]);

    if (action === 'Log a new meal') {
      const imagePath = await selectImage();
      const description = await prompt('Enter a description of your meal: ');
      const { estimatedCalories, nutritionDetails, foodItems, response } = await analyzeMeal(description, imagePath);

      console.log(response);

      const logEntry = {
        date: new Date().toISOString(),
        description,
        estimatedCalories,
        foodItems,
        nutritionDetails,
        imagePath,
      };

      entries.push(logEntry);
      await writeLogFile(entries);
      console.log('Meal logged successfully in', LOG_FILE);

    } else if (action === 'Edit an existing meal') {
      entries = await editMeal(entries);
      await writeLogFile(entries);
      console.log('Meal updated successfully in', LOG_FILE);
    }
  } catch (err) {
    console.error('An unexpected error occurred:', err.message);
  } finally {
    readline.close();
  }
}

// Run the script
main();
