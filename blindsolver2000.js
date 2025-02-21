#feature-id BlindSolver : SetiAstro > Blind Solver 2000
#feature-icon  blindsolver2000.svg
#feature-info This script allows users to query the astrometrynet client to perform a blind astrometric solve then optionally run Image Solver


/******************************************************************************
 *######################################################################
 *#        ___     __      ___       __                                #
 *#       / __/___/ /__   / _ | ___ / /________                        #
 *#      _\ \/ -_) _ _   / __ |(_-</ __/ __/ _ \                       #
 *#     /___/\__/_//_/  /_/ |_/___/\__/_/  \___/                       #
 *#                                                                    #
 *######################################################################
 *
 * Blind Solver 2000
 * Version: V2.1
 * Author: Franklin Marek
 * Website: www.setiastro.com
 *
 * This script allows users to query the astrometrynet client to perform a
 * blind astrometric solve then optionally run Image Solver
 *
 * This work is licensed under a Creative Commons Attribution-NonCommercial 4.0 International License.
 * To view a copy of this license, visit http://creativecommons.org/licenses/by-nc/4.0/
 *
 * You are free to:
 * 1. Share — copy and redistribute the material in any medium or format
 * 2. Adapt — remix, transform, and build upon the material
 *
 * Under the following terms:
 * 1. Attribution — You must give appropriate credit, provide a link to the license, and indicate if changes were made. You may do so in any reasonable manner, but not in any way that suggests the licensor endorses you or your use.
 * 2. NonCommercial — You may not use the material for commercial purposes.
 *
 * @license CC BY-NC 4.0 (http://creativecommons.org/licenses/by-nc/4.0/)
 *
 * COPYRIGHT © 2024 Franklin Marek. ALL RIGHTS RESERVED.
 ******************************************************************************/



// Define constants for the script
#define VERSION     "v2.1"
#define TITLE       "Blind Solver 2000"
#define DESCRIPTION "A script to upload an image to astrometry.net for blind plate-solving."

#include <pjsr/StdButton.jsh>
#include <pjsr/StdIcon.jsh>
#include <pjsr/StdCursor.jsh>
#include <pjsr/Sizer.jsh>
#include <pjsr/FrameStyle.jsh>
#include <pjsr/NumericControl.jsh>
#include <pjsr/FileMode.jsh>
#include <pjsr/DataType.jsh>
#include <pjsr/ImageOp.jsh>
#include <pjsr/SampleType.jsh>
#include <pjsr/UndoFlag.jsh>
#include <pjsr/TextAlign.jsh>
#include <pjsr/FontFamily.jsh>


#ifdef __PI_PLATFORM__MACOSX
    #define CMD_EXEC "/bin/sh"
    #define SCRIPT_EXT ".sh"
#endif
#ifdef __PI_PLATFORM__MSWINDOWS
    #define CMD_EXEC "cmd.exe"
    #define SCRIPT_EXT ".bat"
#endif
#ifdef __PI_PLATFORM__Linux
    #define CMD_EXEC "/bin/sh"
    #define SCRIPT_EXT ".sh"
#endif

// Define the dialog for the Blind Image Solver
function BlindImageSolverDialog() {
    console.hide();
    this.__base__ = Dialog;
    this.__base__();

    // Title
    this.title = TITLE;

    let CMD_EXEC, SCRIPT_EXT;
    if (CoreApplication.platform == "MACOSX") {
        CMD_EXEC = "/bin/sh";
        SCRIPT_EXT = ".sh";
    } else if (CoreApplication.platform == "MSWINDOWS") {
        CMD_EXEC = "cmd.exe";
        SCRIPT_EXT = ".bat";
    } else if (CoreApplication.platform == "Linux") {
        CMD_EXEC = "/bin/sh";
        SCRIPT_EXT = ".sh";
    }

    // File path for storing the API key
    let apiKeyFilePath = File.systemTempDirectory + "/astrometry_api_key.txt";
    // File path for storing the ASTAP executable path
    let astapExePathFilePath = File.systemTempDirectory + "/astap_executable_path.txt";

    // Function to load API key from file
    this.loadApiKey = function() {
        if (File.exists(apiKeyFilePath)) {
            return File.readFile(apiKeyFilePath);
        }
        return "";
    };

    // Function to save API key to file
    this.saveApiKey = function(apiKey) {
        File.writeTextFile(apiKeyFilePath, apiKey);
    };

    // Function to load ASTAP executable path from file
    this.loadAstapPath = function() {
        if (File.exists(astapExePathFilePath)) {
            return File.readFile(astapExePathFilePath);
        }
        return "";
    };

    // Function to save ASTAP executable path to file
    this.saveAstapPath = function(path) {
        File.writeTextFile(astapExePathFilePath, path);
    };

    // Load saved API key and ASTAP executable path
    let savedApiKey = String(this.loadApiKey());
    let savedAstapPath = String(this.loadAstapPath());

    // Image Selection Dropdown
    this.imageSelectionLabel = new Label(this);
    this.imageSelectionLabel.text = "Select Image:";
    this.imageSelectionLabel.textAlignment = TextAlign_Right | TextAlign_VertCenter;

    this.imageSelectionDropdown = new ComboBox(this);
    this.imageSelectionDropdown.editEnabled = false;

    let windows = ImageWindow.windows;
    let activeWindowId = ImageWindow.activeWindow.mainView.id;
    for (let i = 0; i < windows.length; ++i) {
        this.imageSelectionDropdown.addItem(windows[i].mainView.id);
        if (windows[i].mainView.id === activeWindowId) {
            this.imageSelectionDropdown.currentItem = i; // Default to active image
        }
    }

    this.imageSelectionSizer = new HorizontalSizer;
    this.imageSelectionSizer.spacing = 4;
    this.imageSelectionSizer.add(this.imageSelectionLabel);
    this.imageSelectionSizer.add(this.imageSelectionDropdown, 100);

    // API Key Input
    this.apiKeyLabel = new Label(this);
    this.apiKeyLabel.text = "Astrometry.net API Key:";
    this.apiKeyLabel.textAlignment = TextAlign_Right | TextAlign_VertCenter;

    this.apiKeyInput = new Edit(this);
    this.apiKeyInput.text = savedApiKey; // Use saved API key if available

    this.apiKeySizer = new HorizontalSizer;
    this.apiKeySizer.spacing = 4;
    this.apiKeySizer.add(this.apiKeyLabel);
    this.apiKeySizer.add(this.apiKeyInput, 100);

    // ASTAP Executable Path Field (read-only) with a Wrench Icon Button for browsing
    this.astapLabel = new Label(this);
    this.astapLabel.text = "ASTAP Executable Path:";
    this.astapLabel.textAlignment = TextAlign_Right | TextAlign_VertCenter;

    this.astapInput = new Edit(this);
    this.astapInput.readOnly = true;
    // Use the saved ASTAP path if available; otherwise, set a default.
    this.astapInput.text = savedAstapPath || "";

    this.astapSetupButton = new ToolButton(this);
    this.astapSetupButton.icon = this.scaledResource(":/icons/wrench.png");
    this.astapSetupButton.setScaledFixedSize(24, 24);
    this.astapSetupButton.toolTip = "<p>Select folder containing ASTAP executable.</p>";
this.astapSetupButton.onClick = function() {
    // For macOS, use GetFileDialog to allow file selection.
    if (CoreApplication.platform == "MACOSX" || CoreApplication.platform == "macOS") {
        let fileDialog = new OpenFileDialog;
        fileDialog.caption = "Select ASTAP Executable";
        fileDialog.filter = "Executable Files (*)";
        fileDialog.initialPath = this.astapInput.text || File.systemTempDirectory;
        if (fileDialog.execute()) {
            let newPath = fileDialog.fileName;
            this.astapInput.text = newPath;
            this.saveAstapPath(newPath);
        }
    } else {
        // For Windows and Linux, use GetDirectoryDialog.
        let pathDialog = new GetDirectoryDialog;
        pathDialog.initialPath = this.astapInput.text || File.systemTempDirectory;
        if (pathDialog.execute()) {
            let folder = pathDialog.directory;
            let newPath = "";
            if (CoreApplication.platform == "MSWINDOWS" || CoreApplication.platform == "Windows")
                newPath = folder + "/astap.exe";
            else
                newPath = folder + "/astap";
            this.astapInput.text = newPath;
            this.saveAstapPath(newPath);
        }
    }
}.bind(this);

    this.astapPathSizer = new HorizontalSizer;
    this.astapPathSizer.spacing = 4;
    this.astapPathSizer.add(this.astapInput, 100);
    this.astapPathSizer.add(this.astapSetupButton);

    this.astapMainSizer = new VerticalSizer;
    this.astapMainSizer.spacing = 4;
    this.astapMainSizer.add(this.astapLabel);
    this.astapMainSizer.add(this.astapPathSizer);

    // Checkbox for Linear Data
    this.linearDataCheckbox = new CheckBox(this);
    this.linearDataCheckbox.text = "Auto Detect Linear Data";
    this.linearDataCheckbox.checked = true; // Default to checked

    // Start Button
    this.startButton = new PushButton(this);
    this.startButton.text = "Start Plate Solve";
    this.startButton.onClick = () => {
        this.saveApiKey(this.apiKeyInput.text.trim());
        this.startPlateSolve();
    };

    // Status Text
    this.statusText = new Label(this);
    this.statusText.text = "";
    this.statusText.textAlignment = TextAlign_Left | TextAlign_VertCenter;

    // Close Button
    this.closeButton = new PushButton(this);
    this.closeButton.text = "Close";
    this.closeButton.onClick = () => this.cancel();

    // New Instance Button
    this.newInstanceButton = new ToolButton(this);
    this.newInstanceButton.icon = this.scaledResource(":/process-interface/new-instance.png");
    this.newInstanceButton.setScaledFixedSize(24, 24);
    this.newInstanceButton.toolTip = "<p>Create a new instance of this process.</p>";
    this.newInstanceButton.onMousePress = function() {
        this.dialog.newInstance();
    }.bind(this);

    this.newInstanceButtonSizer = new HorizontalSizer;
    this.newInstanceButtonSizer.spacing = 6;
    this.newInstanceButtonSizer.add(this.newInstanceButton);
    this.newInstanceButtonSizer.addStretch();

    this.buttonSizer = new HorizontalSizer;
    this.buttonSizer.spacing = 6;
    this.buttonSizer.add(this.startButton);
    this.buttonSizer.addStretch();
    this.buttonSizer.add(this.closeButton);

    // Main Sizer
    this.sizer = new VerticalSizer;
    this.sizer.margin = 6;
    this.sizer.spacing = 6;
    this.sizer.add(this.imageSelectionSizer);
    this.sizer.addSpacing(4);
    this.sizer.add(this.apiKeySizer);
    this.sizer.addSpacing(4);
    this.sizer.add(this.astapMainSizer); // Add the ASTAP executable path field
    this.sizer.addSpacing(4);
    this.sizer.add(this.linearDataCheckbox);
    this.sizer.addSpacing(4);
    this.sizer.add(this.statusText);
    this.sizer.addSpacing(4);
    this.sizer.add(this.buttonSizer);
    this.sizer.addSpacing(4);
    this.sizer.add(this.newInstanceButtonSizer);

    this.windowTitle = TITLE + " - " + VERSION;
    this.adjustToContents();
    this.setFixedSize();
}

BlindImageSolverDialog.prototype = new Dialog;


BlindImageSolverDialog.prototype.getSessionKey = function(apiKey) {
    let sessionKey = null;
    let loginUrl = "http://nova.astrometry.net/api/login";

    // Properly formatted JSON string for the API key
    let requestData = "request-json={\\\"apikey\\\":\\\"" + apiKey + "\\\"}";

    let responseFilename = File.systemTempDirectory + "/astrometry_login_response.json";
    if (File.exists(responseFilename)) {
        File.remove(responseFilename);  // Ensure old file is deleted before starting the process
    }

    // Platform-specific variables
    let CMD_EXEC, scriptFilePath, curlCommand, scriptContent;

    if (CoreApplication.platform == "MACOSX" || CoreApplication.platform == "macOS") {
        // macOS specific setup
        CMD_EXEC = "/bin/sh";
        scriptFilePath = File.systemTempDirectory + "/login_curl.sh";
        curlCommand = "/usr/bin/curl -X POST -d \"" + requestData + "\" " + loginUrl + " -o " + responseFilename;
        scriptContent = "#!/bin/bash\n" + curlCommand + "\n";
    } else if (CoreApplication.platform == "MSWINDOWS" || CoreApplication.platform == "Windows") {
        // Windows specific setup
        CMD_EXEC = "cmd.exe";
        scriptFilePath = File.systemTempDirectory + "/login_curl.bat";
        curlCommand = "curl -X POST -d \"" + requestData + "\" " + loginUrl + " -o " + responseFilename;
        scriptContent = "@echo on\n" + curlCommand + "\nexit\n";
    } else if (CoreApplication.platform == "Linux") {
        CMD_EXEC = "/bin/sh";
        scriptFilePath = File.systemTempDirectory + "/login_curl.sh";
        curlCommand = "/usr/bin/curl -X POST -d \"" + requestData + "\" " + loginUrl + " -o " + responseFilename;
        scriptContent = "#!/bin/bash\n" + curlCommand + "\n";
    } else {
        console.criticalln("Unsupported platform: " + CoreApplication.platform);
        return null;
    }

    try {
        // Write the script file (either .bat or .sh based on the platform)
        File.writeTextFile(scriptFilePath, scriptContent);
        console.noteln("Login script file created: " + scriptFilePath);
        console.flush();
    } catch (error) {
        console.criticalln("Failed to create login script file: " + error.message);
        console.flush();
        return null;
    }

    let process = new ExternalProcess;

    try {
        console.show();
        console.writeln("Executing script file using: " + CMD_EXEC + " " + scriptFilePath);
        console.flush();

 // Adjust process execution for macOS and Linux (remove "/c")
if (CoreApplication.platform == "MACOSX" || CoreApplication.platform == "macOS") {
    // macOS specific
    if (!process.start(CMD_EXEC, [scriptFilePath])) {
        console.warningln("Login script process started (macOS).");
        console.flush();
    } else {
        console.noteln("Login command launched successfully (macOS).");
        console.flush();
    }
} else if (CoreApplication.platform == "Linux") {
    // Linux specific
    if (!process.start(CMD_EXEC, [scriptFilePath])) {
        console.warningln("Login script process started (Linux).");
        console.flush();
    } else {
        console.noteln("Login command launched successfully (Linux).");
        console.flush();
    }
} else {
    // For Windows, use "/c"
    if (!process.start(CMD_EXEC, ["/c", scriptFilePath])) {
        console.warningln("Login script process started (Windows).");
        console.flush();
    } else {
        console.noteln("Login command launched successfully (Windows).");
        console.flush();
    }
}


        // Wait for the response file to be created
        let maxWaitTime = 15000;  // Maximum wait time of 15 seconds (adjust as needed)
        let waitTime = 0;

        while (!File.exists(responseFilename)) {
            if (waitTime >= maxWaitTime) {
                console.criticalln("Timeout waiting for response file.");
                return null;
            }
            console.noteln("Waiting for the login process to complete...");
            console.flush();
            msleep(1000);  // Sleep for 1 second between checks
            waitTime += 1000;
        }

        // Once the response file exists, read and process the JSON response
        if (File.exists(responseFilename)) {
            let jsonResponse = JSON.parse(File.readFile(responseFilename));
            console.writeln("Raw JSON response: " + JSON.stringify(jsonResponse));
            console.flush();

            if (jsonResponse.status === "success") {
                sessionKey = jsonResponse.session;
                console.noteln("Login successful, session key: " + sessionKey);
            } else {
                console.warningln("Login failed. Response: " + JSON.stringify(jsonResponse, null, 2));
            }
            // Clean up the response file
            File.remove(responseFilename);
        } else {
            console.warningln("Login script file did not execute as expected.");
            console.flush();
        }
    } catch (error) {
        console.warningln("An error occurred while starting the login script file process: " + error.message);
        console.flush();
    }

    // Clean up the script file after use
    if (File.exists(scriptFilePath)) {
        File.remove(scriptFilePath);
        console.noteln("Script file cleaned up: " + scriptFilePath);
    }

    return sessionKey;
};




// Function to start the plate solve process
BlindImageSolverDialog.prototype.startPlateSolve = function() {
    this.statusText.text = "Starting...";
    this.startButton.enabled = false;

    // Step 1: Save the image first
    let imageFile = this.saveImageAsJpg();
    if (!imageFile) {
        this.statusText.text = "Error saving image.";
        this.startButton.enabled = true;
        return;
    }
    console.noteln("Image saved successfully: " + imageFile);
    console.flush();

    // If the ASTAP executable path is set, attempt ASTAP plate solve first.
    // If ASTAP path is provided, try ASTAP first.
    if (this.astapInput.text.trim() !== "") {
        this.statusText.text = "Attempting ASTAP plate solve...";
        let outputFiles = this.runASTAPPlateSolve(imageFile);
        if (outputFiles) {
            let calibrationData = this.parseASTAPCalibration(outputFiles);
            if (calibrationData) {
                this.applyAstrometricSolution(calibrationData);
                this.statusText.text = "Plate solve completed using ASTAP!";
                console.hide();
                this.startButton.enabled = true;
                return;
            } else {
                console.warningln("Failed to parse ASTAP calibration data. Falling back to astrometry.net.");
            }
        } else {
            console.warningln("ASTAP plate solve failed. Falling back to astrometry.net.");
        }
    }


    // Step 2: Get the API key
    let apiKey = this.apiKeyInput.text.trim();
    if (!apiKey) {
        this.statusText.text = "API key is required.";
        this.startButton.enabled = true;
        return;
    }

    // Step 3: Obtain the session key
    let sessionKey = this.getSessionKey(apiKey);
    if (!sessionKey) {
        this.statusText.text = "Error obtaining session key.";
        this.startButton.enabled = true;
        return;
    }

    // Step 4: Upload the image to astrometry.net
    this.statusText.text = "Uploading image to astrometry.net...";
    let subid = this.uploadImageToAstrometry(imageFile, sessionKey);
    if (!subid) {
        this.statusText.text = "Error uploading image.";
        this.startButton.enabled = true;
        return;
    }

    // Step 5: Poll for submission status and retrieve calibration data
    this.statusText.text = "Submission successful. Waiting for solution...";
    let jobID = this.pollSubmissionStatus(subid);
    if (!jobID) {
        this.statusText.text = "Error retrieving submission status.";
        this.startButton.enabled = true;
        return;
    }

    this.statusText.text = "Solution found. Retrieving calibration data...";
    let calibrationData = this.getJobCalibration(jobID);
    if (!calibrationData) {
        this.statusText.text = "Error retrieving calibration data.";
        this.startButton.enabled = true;
        return;
    }

    this.applyAstrometricSolution(calibrationData);

    this.statusText.text = "Plate solve completed!";
    console.hide();
    this.startButton.enabled = true;
};

// Save the image as .jpg
BlindImageSolverDialog.prototype.saveImageAsJpg = function() {
    let selectedWindow = ImageWindow.activeWindow;
    let homeDir = File.systemTempDirectory;
    let jpgPath = homeDir + "/temp_image.jpg";
    let exportImage = new ImageWindow(
        selectedWindow.mainView.image.width,
        selectedWindow.mainView.image.height,
        3, // RGB
        16, // 8-bit depth
        false, // no alpha
        false, // no grayscale
        selectedWindow.mainView.id + "_temp"
    );
    exportImage.mainView.beginProcess(UndoFlag_NoSwapFile);
    exportImage.mainView.image.assign(selectedWindow.mainView.image);
    exportImage.mainView.endProcess();

    // Function to calculate the image's median
function calculate_image_median(var_image) {
    return var_image.median();
}

      // Check if the linear data checkbox is checked
    if (this.linearDataCheckbox.checked) {
        console.noteln("Auto Linear data checkbox is checked. Verifying and Stretching if needed...");

   // Calculate the image's median value using the custom function
    let medianValue = calculate_image_median(exportImage.mainView.image);

    // Check if the median is less than 0.1
    if (medianValue < 0.1) {
        console.noteln("Image median is less than 0.1. Applying PixelMath transformation...");

        // Apply PixelMath transformation
        var P = new PixelMath;
        P.expression = "C = -2.8  ;  //Shadow Clipping (Default value -2.8)\n" +
                       "B = 0.25  ;  //Background value (Higher the value, more stretched)\n" +
                       "c = min(max(0,med($T)+C*1.4826*mdev($T)),1);\n" +
                       "mtf(mtf(B,med($T)-c),max(0,($T-c)/~c))";
        P.expression1 = "";
        P.expression2 = "";
        P.expression3 = "";
        P.useSingleExpression = true;
        P.symbols = "C,B,c";
        P.clearImageCacheAndExit = false;
        P.cacheGeneratedImages = false;
        P.generateOutput = true;
        P.singleThreaded = false;
        P.optimization = true;
        P.use64BitWorkingImage = false;
        P.rescale = false;
        P.rescaleLower = 0;
        P.rescaleUpper = 1;
        P.truncate = true;
        P.truncateLower = 0;
        P.truncateUpper = 1;
        P.createNewImage = false;
        P.showNewImage = false;  // Do not show the new image, just apply to the current one
        P.newImageId = "";
        P.newImageWidth = 0;
        P.newImageHeight = 0;
        P.newImageAlpha = false;
        P.newImageColorSpace = PixelMath.prototype.SameAsTarget;
        P.newImageSampleFormat = PixelMath.prototype.SameAsTarget;

        // Apply PixelMath to the temp image
        P.executeOn(exportImage.mainView);
    } else {
        console.noteln("Image median is greater than or equal to 0.1. Skipping PixelMath transformation.");
    }
}

    // Manually set JPEG save options
    let fileSaveOptions = {
        compression: 9, // Maximum quality for JPEG
        overwrite: true  // Suppress overwrite confirmation
    };

    exportImage.saveAs(jpgPath, false, false, false, false); // Save without dialogs
    exportImage.close();
    console.noteln("Image saved successfully: " + jpgPath);
    return jpgPath;
};

// Upload image to astrometry.net
BlindImageSolverDialog.prototype.uploadImageToAstrometry = function(imageFile, sessionKey) {
    let subid = null;

    // Create a temporary file to store the response
    let responseFilename = File.systemTempDirectory + "/astrometry_response.json";
    if (File.exists(responseFilename)) {
        File.remove(responseFilename);
    }

// Platform-specific setup
let CMD_EXEC, scriptFilePath, curlCommand, scriptContent;
if (CoreApplication.platform == "MACOSX" || CoreApplication.platform == "macOS") {
    CMD_EXEC = "/bin/sh";
    scriptFilePath = File.systemTempDirectory + "/run_curl.sh";
    curlCommand = "/usr/bin/curl -v -F \"request-json={\\\"publicly_visible\\\": \\\"y\\\", \\\"allow_modifications\\\": \\\"d\\\", \\\"session\\\": \\\"" + sessionKey + "\\\", \\\"allow_commercial_use\\\": \\\"d\\\"}\"" +
                  " -F \"file=@" + imageFile + "\" " +
                  "http://nova.astrometry.net/api/upload -o " + responseFilename;
    scriptContent = "#!/bin/bash\n" + curlCommand + "\n";
} else if (CoreApplication.platform == "MSWINDOWS" || CoreApplication.platform == "Windows") {
    CMD_EXEC = "cmd.exe";
    scriptFilePath = File.systemTempDirectory + "/run_curl.bat";
    curlCommand = "curl -v -F \"request-json={\\\"publicly_visible\\\": \\\"y\\\", \\\"allow_modifications\\\": \\\"d\\\", \\\"session\\\": \\\"" + sessionKey + "\\\", \\\"allow_commercial_use\\\": \\\"d\\\"}\"" +
                  " -F \"file=@" + imageFile + "\" " +
                  "http://nova.astrometry.net/api/upload -o " + responseFilename;
    scriptContent = "@echo on\n" + curlCommand + "\nexit\n";
} else if (CoreApplication.platform == "Linux") {
    CMD_EXEC = "/bin/sh";
    scriptFilePath = File.systemTempDirectory + "/run_curl.sh";
    curlCommand = "/usr/bin/curl -v -F \"request-json={\\\"publicly_visible\\\": \\\"y\\\", \\\"allow_modifications\\\": \\\"d\\\", \\\"session\\\": \\\"" + sessionKey + "\\\", \\\"allow_commercial_use\\\": \\\"d\\\"}\"" +
                  " -F \"file=@" + imageFile + "\" " +
                  "http://nova.astrometry.net/api/upload -o " + responseFilename;
    scriptContent = "#!/bin/bash\n" + curlCommand + "\n";

    // Ensure the script has execute permissions on Linux
    let chmodCommand = "/bin/chmod +x " + scriptFilePath;
    let chmodProcess = new ExternalProcess();
    chmodProcess.start(CMD_EXEC, [chmodCommand]);
    if (!chmodProcess.isRunning) {
        console.noteln("Permissions granted for Linux script.");
    } else {
        console.criticalln("Failed to grant execute permissions on Linux.");
    }
} else {
    console.criticalln("Unsupported platform: " + CoreApplication.platform);
    return null;
}


    // Write the script file and log the content to the console
    console.writeln("Script content:");
    console.writeln(scriptContent);  // This logs the entire script content for debugging purposes
    console.flush();

    try {
        // Write the script file (either .bat or .sh based on the platform)
        File.writeTextFile(scriptFilePath, scriptContent);
        console.noteln("Curl script file created: " + scriptFilePath);
        console.flush();
    } catch (error) {
        console.criticalln("Failed to create curl script file: " + error.message);
        console.flush();
        return null;
    }

    let process = new ExternalProcess();

    try {
        console.show();
        console.writeln("Executing curl script file using: " + CMD_EXEC + " " + scriptFilePath);
        console.flush();

// Adjust process execution for macOS and Linux (remove "/c")
if (CoreApplication.platform == "MACOSX" || CoreApplication.platform == "macOS") {
    // macOS specific
    if (!process.start(CMD_EXEC, [scriptFilePath])) {
        console.warningln("Curl script process started (macOS).");
        console.flush();
    } else {
        console.noteln("Curl launched successfully (macOS).");
        console.flush();
    }
} else if (CoreApplication.platform == "Linux") {
    // Linux specific
    if (!process.start(CMD_EXEC, [scriptFilePath])) {
        console.warningln("Curl script process started (Linux).");
        console.flush();
    } else {
        console.noteln("Curl launched successfully (Linux).");
        console.flush();
    }
} else {
    // For Windows, use "/c"
    if (!process.start(CMD_EXEC, ["/c", scriptFilePath])) {
        console.warningln("Curl process started (Windows).");
        console.flush();
    } else {
        console.noteln("Curl launched successfully (Windows).");
        console.flush();
    }
}


        // Wait for the response file to be created
        let maxWaitTime = 15000;  // Maximum wait time of 15 seconds
        let waitTime = 0;

        while (!File.exists(responseFilename)) {
            if (waitTime >= maxWaitTime) {
                console.criticalln("Timeout waiting for curl response file.");
                return null;
            }
            console.noteln("Waiting for the curl process to complete...");
            console.flush();
            msleep(1000);  // Sleep for 1 second between checks
            waitTime += 1000;
        }

        // Once the response file exists, read and process the JSON response
        if (File.exists(responseFilename)) {
            let jsonResponse = JSON.parse(File.readFile(responseFilename));
            console.writeln("Raw JSON response: " + JSON.stringify(jsonResponse));
            console.flush();

            if (jsonResponse.status === "success") {
                subid = jsonResponse.subid;
                console.noteln("Submission successful, subid: " + subid);
            } else {
                console.warningln("Submission failed. Response: " + JSON.stringify(jsonResponse, null, 2));
            }
            // Clean up the response file **after** processing is done
            File.remove(responseFilename);
        } else {
            console.warningln("Curl script did not execute as expected.");
            console.flush();
        }
    } catch (error) {
        console.warningln("An error occurred while starting the curl script process: " + error.message);
        console.flush();
    }

    // Clean up the script file after use
    if (File.exists(scriptFilePath)) {
        File.remove(scriptFilePath);
        console.noteln("Curl script file cleaned up: " + scriptFilePath);
    }

    return subid;
};


// Poll submission status
BlindImageSolverDialog.prototype.pollSubmissionStatus = function(subid) {
    let jobID = null;
    let retries = 0;
    const maxRetries = 90; // Wait for up to 15 minutes (90 * 10 seconds)

// Platform-specific setup
let CMD_EXEC, SCRIPT_EXT;
if (CoreApplication.platform == "MACOSX" || CoreApplication.platform == "macOS") {
    CMD_EXEC = "/bin/sh";
    SCRIPT_EXT = ".sh";
} else if (CoreApplication.platform == "MSWINDOWS" || CoreApplication.platform == "Windows") {
    CMD_EXEC = "cmd.exe";
    SCRIPT_EXT = ".bat";
} else if (CoreApplication.platform == "Linux") {
    CMD_EXEC = "/bin/sh";
    SCRIPT_EXT = ".sh";
    // For Linux, we need to ensure the script has execute permissions
    let chmodCommand = "/bin/chmod +x " + File.systemTempDirectory + "/script" + SCRIPT_EXT;
    let chmodProcess = new ExternalProcess();
    chmodProcess.start(CMD_EXEC, [chmodCommand]);
    if (!chmodProcess.isRunning) {
        console.noteln("Permissions granted for Linux script.");
    } else {
        console.criticalln("Failed to grant execute permissions on Linux.");
    }
} else {
    console.criticalln("Unsupported platform: " + CoreApplication.platform);
    return null;
}


    while (retries < maxRetries) {
        // Create a temporary file to store the response
        let responseFilename = File.systemTempDirectory + "/astrometry_submission_status.json";
        if (File.exists(responseFilename)) {
            File.remove(responseFilename); // Ensure any old response file is deleted
        }

        // Curl command
        let curlCommand = "curl -X GET http://nova.astrometry.net/api/submissions/" + subid + " -o " + responseFilename;

        // Script file path
        let scriptFilePath = File.systemTempDirectory + "/status_curl" + SCRIPT_EXT;

        // Script content
        let scriptContent;
        if (CoreApplication.platform == "MACOSX" || CoreApplication.platform == "macOS" || CoreApplication.platform == "Linux") {
            scriptContent = "#!/bin/bash\n" + curlCommand + "\n";
        } else if (CoreApplication.platform == "MSWINDOWS" || CoreApplication.platform == "Windows") {
            scriptContent = "@echo on\n" + curlCommand + "\nexit\n";
        }

        try {
            // Write the script file
            File.writeTextFile(scriptFilePath, scriptContent);
            console.noteln("Status check script file created: " + scriptFilePath);
            console.flush();
        } catch (error) {
            console.criticalln("Failed to create status check script file: " + error.message);
            console.flush();
            return null;
        }

        let process = new ExternalProcess;

        try {
            console.writeln("Executing status check script file: " + scriptFilePath);
            console.flush();

// Adjust process execution for macOS, Linux, and Windows
if (CoreApplication.platform == "MACOSX" || CoreApplication.platform == "macOS") {
    if (!process.start(CMD_EXEC, [scriptFilePath])) {
        console.warningln("Status check process started.");
        console.flush();
    } else {
        console.noteln("Status check launched successfully.");
        console.flush();
    }
} else if (CoreApplication.platform == "Linux") {
    // Ensure the Linux script has execute permissions
    let chmodCommand = "/bin/chmod +x " + scriptFilePath;
    let chmodProcess = new ExternalProcess();
    chmodProcess.start("/bin/sh", [chmodCommand]);

    if (!chmodProcess.isRunning) {
        console.noteln("Linux script permission granted.");
        // Execute the script
        if (!process.start(CMD_EXEC, [scriptFilePath])) {
            console.warningln("Status check process started.");
            console.flush();
        } else {
            console.noteln("Status check launched successfully.");
            console.flush();
        }
    } else {
        console.criticalln("Failed to grant execute permissions on Linux.");
    }
} else {
    // For Windows, use "/c"
    if (!process.start(CMD_EXEC, ["/c", scriptFilePath])) {
        console.warningln("Status check process started.");
        console.flush();
    } else {
        console.noteln("Status check launched successfully.");
        console.flush();
    }
}


            // Wait for the process to complete or the response file to be created
            let processTimeout = 0;  // A timeout to avoid indefinite waiting for a file that might not get created

            while (process.isRunning || !File.exists(responseFilename)) {
                console.noteln("Waiting for the status check process to complete...");
                console.flush();
                msleep(10000); // Wait for 10 seconds before retrying

                processTimeout += 10000;
                if (processTimeout >= 30000) {  // Set an arbitrary timeout of 30 seconds
                    console.warningln("Process timeout reached.");
                    break;
                }
            }

            // Check if the response file exists
            if (File.exists(responseFilename)) {
                let jsonResponse = JSON.parse(File.readFile(responseFilename));
                console.writeln("Raw JSON response: " + JSON.stringify(jsonResponse));
                console.flush();

                if (jsonResponse.jobs && jsonResponse.jobs.length > 0 && jsonResponse.jobs[0] !== null) {
                    jobID = jsonResponse.jobs[0];
                    console.noteln("Job ID found: " + jobID);
                    File.remove(responseFilename); // Clean up the response file
                    return jobID;
                } else {
                    console.warningln("Job ID not found or is null. Response: " + JSON.stringify(jsonResponse));
                }
                File.remove(responseFilename); // Clean up
            } else {
                let stdErr = process.readStandardError();
                let stdOut = process.readStandardOutput();
                console.warningln("Status check script file did not execute as expected.");
                console.writeln("Standard Output: " + stdOut);
                console.writeln("Standard Error: " + stdErr);
                console.flush();
            }
        } catch (error) {
            console.warningln("An error occurred while starting the status check script file process: " + error.message);
            console.flush();
        }

        console.noteln("Waiting for submission to be processed... (Retry " + (retries + 1) + ")");
        console.flush();
        msleep(10000); // Wait for 10 seconds before retrying
        retries++;
    }

    console.warningln("Max retries reached. Submission status check failed.");
    console.flush();
    return null;
};


BlindImageSolverDialog.prototype.getJobCalibration = function(jobID) {
    let calibrationData = null;
    let retries = 0;
    const maxRetries = 90;  // Retry up to 90 times (15 minutes total)
    const waitTime = 10000; // Wait for 10 seconds between retries
    let success = false;

    // Platform-specific setup
    let CMD_EXEC, SCRIPT_EXT;
    if (CoreApplication.platform == "MACOSX" || CoreApplication.platform == "macOS") {
        CMD_EXEC = "/bin/sh";
        SCRIPT_EXT = ".sh";
    } else if (CoreApplication.platform == "MSWINDOWS" || CoreApplication.platform == "Windows") {
        CMD_EXEC = "cmd.exe";
        SCRIPT_EXT = ".bat";
    } else if (CoreApplication.platform == "Linux") {
        CMD_EXEC = "/bin/sh";
        SCRIPT_EXT = ".sh";
    } else {
        console.criticalln("Unsupported platform: " + CoreApplication.platform);
        return null;
    }

    // Define the response file for the calibration data
    let responseFilename = File.systemTempDirectory + "/astrometry_job_calibration.json";
    if (File.exists(responseFilename)) {
        File.remove(responseFilename);  // Remove any old response file
    }

    // Declare scriptFilePath here to ensure it can be used later in the cleanup
    let scriptFilePath = File.systemTempDirectory + "/calibration_curl" + SCRIPT_EXT;

    while (retries < maxRetries && !success) {
        // Curl command to fetch calibration data
        let curlCommand = "curl -X GET http://nova.astrometry.net/api/jobs/" + jobID + "/calibration/ -o " + responseFilename;

        // Script content
        let scriptContent;
        if (CoreApplication.platform == "MACOSX" || CoreApplication.platform == "macOS" || CoreApplication.platform == "Linux") {
            scriptContent = "#!/bin/bash\n" + curlCommand + "\n";

            // On Linux, ensure the script has execute permissions
            if (CoreApplication.platform == "Linux") {
                let chmodProcess = new ExternalProcess();
                let chmodCommand = "/bin/chmod";
                let chmodArgs = ["+x", scriptFilePath];

                console.noteln("Setting Linux script permissions for: " + scriptFilePath);
                chmodProcess.start(chmodCommand, chmodArgs);  // Use 'start' instead of 'execute'

                if (!chmodProcess.isRunning) {
                    console.noteln("Linux script permission granted.");
                } else {
                    console.criticalln("Failed to grant execute permissions on Linux.");
                }
            }
        } else if (CoreApplication.platform == "MSWINDOWS" || CoreApplication.platform == "Windows") {
            scriptContent = "@echo on\n" + curlCommand + "\nexit\n";
        }

        // Write the script file
        try {
            File.writeTextFile(scriptFilePath, scriptContent);
            console.noteln("Calibration check script file created: " + scriptFilePath);
            console.flush();
        } catch (error) {
            console.criticalln("Failed to create calibration check script file: " + error.message);
            console.flush();
            return null;
        }

        let process = new ExternalProcess;

        try {
            console.writeln("Executing calibration check script file using: " + CMD_EXEC + " " + scriptFilePath);
            console.flush();

            // Adjust process execution for macOS and Linux
            if (CoreApplication.platform == "MACOSX" || CoreApplication.platform == "macOS" || CoreApplication.platform == "Linux") {
                // Start the process
                if (!process.start(CMD_EXEC, [scriptFilePath])) {
                    console.warningln("Calibration script process started.");
                    console.flush();
                } else {
                    console.noteln("Calibration launched successfully.");
                    console.flush();
                }
            } else {
                // For Windows, use "/c"
                if (!process.start(CMD_EXEC, ["/c", scriptFilePath])) {
                    console.warningln("Calibration script process started.");
                    console.flush();
                } else {
                    console.noteln("Calibration launched successfully.");
                    console.flush();
                }
            }

            // Wait for the process to complete or the response file to be created
            while (process.isRunning || !File.exists(responseFilename)) {
                console.noteln("Waiting for the calibration check process to complete (Retry " + (retries + 1) + "/" + maxRetries + ")...");
                console.flush();
                msleep(waitTime); // Wait for 10 seconds between checks
                retries++;
            }

            // Check if the response file exists and process it
            if (File.exists(responseFilename)) {
                let jsonResponse = JSON.parse(File.readFile(responseFilename));
                console.writeln("Raw JSON response: " + JSON.stringify(jsonResponse));
                console.flush();

                if (jsonResponse && jsonResponse.ra) {
                    calibrationData = jsonResponse;
                    console.noteln("Calibration data retrieved successfully.");
                    success = true;  // Indicate success
                    File.remove(responseFilename);  // Clean up the response file
                } else {
                    console.warningln("Calibration data not available or incomplete. Response: " + JSON.stringify(jsonResponse));
                }
            } else {
                let stdErr = process.readStandardError();
                let stdOut = process.readStandardOutput();
                console.warningln("Calibration check script file did not execute as expected.");
                console.writeln("Standard Output: " + stdOut);
                console.writeln("Standard Error: " + stdErr);
                console.flush();
            }
        } catch (error) {
            console.warningln("An error occurred while starting the calibration check script process: " + error.message);
            console.flush();
        }

        if (!success && retries >= maxRetries) {
            console.warningln("Max retries reached. Calibration data retrieval failed.");
            console.flush();
            break;
        }
    }

    // Clean up the script file after use
    if (File.exists(scriptFilePath)) {
        File.remove(scriptFilePath);
        console.noteln("Calibration check script file cleaned up: " + scriptFilePath);
    }

    return calibrationData;
};



BlindImageSolverDialog.prototype.applyAstrometricSolution = function(calibrationData) {
       // Clean up temporary files (if they exist)
    let tempJpg = File.systemTempDirectory + "/temp_image.jpg";
    let tempWcs = File.systemTempDirectory + "/temp_image.wcs";
    let tempIni = File.systemTempDirectory + "/temp_image.ini"; // New cleanup for INI file

    [tempJpg, tempWcs, tempIni].forEach(function(filePath) {
        if (File.exists(filePath)) {
            try {
                File.remove(filePath);
                Console.noteln("Deleted temporary file: " + filePath);
            } catch (e) {
                Console.warningln("Could not delete temporary file: " + filePath);
            }
        }
    });
   Console.noteln("applyAstrometricSolution received calibrationData: " + JSON.stringify(calibrationData, null, 2));
    let selectedWindow = ImageWindow.activeWindow;
    if (selectedWindow.isNull) {
        console.warningln("No active image window found.");
        return;
    }

    console.writeln("Astrometric Solution:");
    console.writeln("RA: " + calibrationData.ra.toFixed(6));
    console.writeln("Dec: " + calibrationData.dec.toFixed(6));
    console.writeln("Pixel Scale: " + calibrationData.pixscale.toFixed(6) + " arcsec/pixel");
    console.writeln("Orientation: " + calibrationData.orientation.toFixed(6) + " degrees");
    console.writeln("Parity: " + calibrationData.parity);
    console.flush();

    try {
        let view = selectedWindow.mainView;

        // Convert pixel scale (arcsec/pixel) to resolution in degrees per pixel.
        // Note: calibrationData.pixscale is in arcsec/pixel.
        let resolution = calibrationData.pixscale;
        // Convert numbers to strings using fixed precision:
        let raStr = calibrationData.ra.toFixed(6);
        let decStr = calibrationData.dec.toFixed(6);
        let resolutionStr = resolution.toFixed(12);

        // Update the active image's FITS header with WCS-related metadata.
        let keywords = [
            new FITSKeyword("CTYPE1", "RA---TAN", "Coordinate type for axis 1"),
            new FITSKeyword("CTYPE2", "DEC--TAN", "Coordinate type for axis 2"),
            new FITSKeyword("CRVAL1", raStr, "Reference value for axis 1"),
            new FITSKeyword("CRVAL2", decStr, "Reference value for axis 2"),
            new FITSKeyword("CRPIX1", (view.image.width / 2 + 0.5).toFixed(6), "Reference pixel for axis 1"),
            new FITSKeyword("CRPIX2", (view.image.height / 2 + 0.5).toFixed(6), "Reference pixel for axis 2"),
            new FITSKeyword("CD1_1", (-Math.cos(calibrationData.orientation * Math.PI / 180) * calibrationData.pixscale / 3600).toFixed(12), "Transformation matrix element 1_1"),
            new FITSKeyword("CD1_2", (Math.sin(calibrationData.orientation * Math.PI / 180) * calibrationData.pixscale / 3600).toFixed(12), "Transformation matrix element 1_2"),
            new FITSKeyword("CD2_1", (-Math.sin(calibrationData.orientation * Math.PI / 180) * calibrationData.pixscale / 3600).toFixed(12), "Transformation matrix element 2_1"),
            new FITSKeyword("CD2_2", (-Math.cos(calibrationData.orientation * Math.PI / 180) * calibrationData.pixscale / 3600).toFixed(12), "Transformation matrix element 2_2"),
            new FITSKeyword("RADECSYS", "ICRS", "Coordinate reference system")
        ];
        selectedWindow.keywords = keywords;
        console.noteln("Astrometric solution applied to image header successfully.");
   let jd = (Date.now() / 86400000 + 2440587.5).toFixed(0);
   Console.writeln("Today's Julian Date: " + jd);

        // Prepare ImageSolver parameters (all as strings).
        let solverParams = [
            ["metadata_focal", "946.1306914742877"],  // Adjust if needed.
            ["metadata_useFocal", "false"],
            ["metadata_xpixsz", "3.799999952316284"],  // Pixel size in microns.
            ["metadata_resolution", resolutionStr],      // Resolution in degrees per pixel.
            ["metadata_referenceSystem", "ICRS"],
            ["metadata_ra", raStr],
            ["metadata_dec", decStr],
            ["metadata_observationTime", jd],     // Julian Date; adjust if needed.
            ["metadata_topocentric", "false"]
        ];
        Console.noteln("ImageSolver parameters:");
        Console.writeln(JSON.stringify(solverParams, null, 2));

        // Run ImageSolver.
        console.noteln("Running Full ImageSolver...");
        this.statusText.text = "Running Image Solver.";
        #include "AdP/ImageSolver.js"  // Include the ImageSolver script

        let P = new Script;
        P.filePath = "$PXI_SRCDIR/scripts/AdP/ImageSolver.js";
        P.parameters = solverParams;
        P.information = "ImageSolver Script Execution";

        // Execute the ImageSolver script.
        P.execute();

    } catch (error) {
        console.criticalln("Failed to apply astrometric solution.");
        if (typeof error === 'object' && error !== null) {
            console.criticalln("Error details: " + JSON.stringify(error, null, 2));
        } else {
            console.criticalln("Unknown error occurred during astrometric solution application.");
        }
    }
};


// New function: Attempt to run ASTAP plate solve
BlindImageSolverDialog.prototype.runASTAPPlateSolve = function(jpgFile) {
    console.show();
    let astapFullPath = this.astapInput.text.trim();
    if (astapFullPath === "") {
        Console.warningln("ASTAP executable path not provided.");
        return null;
    }
    // On macOS, if the selected path is an app bundle, adjust it to point to the actual executable.
    if ((CoreApplication.platform == "MACOSX" || CoreApplication.platform == "macOS") && astapFullPath.endsWith(".app")) {
        astapFullPath = astapFullPath + "/Contents/MacOS/ASTAP";
        Console.writeln("Adjusted ASTAP path for macOS: " + astapFullPath);
    }
    if (!File.exists(astapFullPath)) {
        Console.criticalln("ASTAP executable not found at: " + astapFullPath);
        return null;
    }

    // Define local CMD_EXEC based on platform.
    let localCMD_EXEC;
    if (CoreApplication.platform == "MSWINDOWS" || CoreApplication.platform == "Windows") {
        localCMD_EXEC = "cmd.exe";
    } else {
        localCMD_EXEC = "/bin/sh";
    }

    // Extract the parent folder and executable name.
    let lastSep = astapFullPath.lastIndexOf("/");
    if (lastSep === -1)
        lastSep = astapFullPath.lastIndexOf("\\");
    if (lastSep === -1) {
        Console.criticalln("Could not determine parent folder from: " + astapFullPath);
        return null;
    }
    let astapFolder = astapFullPath.substring(0, lastSep);
    let astapExeName = astapFullPath.substring(lastSep + 1);

    let scriptFilePath, scriptContent;
    if (CoreApplication.platform == "MSWINDOWS" || CoreApplication.platform == "Windows") {
        scriptFilePath = File.systemTempDirectory + "/run_astap.bat";
        scriptContent = "@echo off\r\n";
        scriptContent += "cd /d \"" + astapFolder + "\"\r\n";
        scriptContent += "\"" + astapExeName + "\" -f \"" + jpgFile + "\" -r179 -fov0 -z0 -wcs\r\n";
        scriptContent += "exit\r\n";
    } else if (CoreApplication.platform == "MACOSX" || CoreApplication.platform == "macOS" || CoreApplication.platform == "Linux") {
        scriptFilePath = File.systemTempDirectory + "/run_astap.sh";
        scriptContent = "#!/bin/sh\n";
        scriptContent += "cd \"" + astapFolder + "\"\n";
        scriptContent += "./" + astapExeName + " -f \"" + jpgFile + "\" -r179 -fov0 -z0 -wcs\n";
        scriptContent += "exit\n";
    } else {
        Console.criticalln("Unsupported platform: " + CoreApplication.platform);
        return null;
    }

    try {
        File.writeTextFile(scriptFilePath, scriptContent);
        Console.writeln("ASTAP script file created: " + scriptFilePath);
        Console.writeln("Script file content:\n" + scriptContent);
    } catch (error) {
        Console.criticalln("Failed to create ASTAP script file: " + error.message);
        return null;
    }

    let process = new ExternalProcess;
    process.onStarted = function() {
        Console.noteln("ASTAP process started: " + localCMD_EXEC + " " + scriptFilePath);
    };
    process.onStandardOutputDataAvailable = function() {
        let output = String(this.stdout);
        Console.writeln("ASTAP STDOUT: " + output);
    };
    process.onStandardErrorDataAvailable = function() {
        let output = String(this.stderr);
        Console.criticalln("ASTAP STDERR: " + output);
    };
    process.onError = function(code) {
        Console.criticalln("ASTAP process error code: " + code);
    };
    process.onFinished = function() {
        Console.noteln("ASTAP process finished.");
    };

    try {
        if (CoreApplication.platform == "MSWINDOWS" || CoreApplication.platform == "Windows") {
            process.start(localCMD_EXEC, ["/c", scriptFilePath]);
        } else {
            process.start(localCMD_EXEC, [scriptFilePath]);
        }
        while (process.isStarting)
            processEvents();
        while (process.isRunning)
            processEvents();
    } catch (error) {
        Console.criticalln("Error starting ASTAP process: " + error.message);
        return null;
    }

let wcsFile = jpgFile.replace(/\.jpg$/i, ".wcs")
                     .replace(/\.fits$/i, ".wcs")
                     .replace(/\.tiff$/i, ".wcs");
let maxWaitTime = 180000; // 3 minutes
let waited = 0;
while (!File.exists(wcsFile) && waited < maxWaitTime) {
    msleep(5000);
    waited += 5000;
}

if (File.exists(wcsFile)) {
    Console.noteln("ASTAP .wcs file found: " + wcsFile);
} else {
    Console.warningln("ASTAP did not output a .wcs file after waiting " + (waited/1000) + " seconds.");
    // If no .wcs file, try looking for the .ini file instead.
    let iniFile = jpgFile.replace(/\.jpg$/i, ".ini")
                         .replace(/\.fits$/i, ".ini")
                         .replace(/\.tiff$/i, ".ini");
    if (File.exists(iniFile)) {
        Console.noteln("ASTAP INI file found: " + iniFile);
        let iniText = File.readFile(iniFile).toString();
        Console.writeln("INI file contents:\n" + iniText);
        // Parse for PLTSOLVD keyword (T or F).
        let pltsolvdMatch = iniText.match(/PLTSOLVD\s*=\s*(\w)/i);
        if (pltsolvdMatch) {
            let pltsolvd = pltsolvdMatch[1].toUpperCase();
            if (pltsolvd === "F") {
                Console.warningln("ASTAP solve failed according to INI file.");
            } else {
                Console.noteln("ASTAP solve reported success in INI file.");
            }
        } else {
            Console.warningln("PLTSOLVD keyword not found in INI file.");
        }
        // Optionally delete the INI file after processing.
        try {
            File.remove(iniFile);
            Console.noteln("Deleted INI file: " + iniFile);
        } catch (e) {
            Console.warningln("Could not delete INI file: " + iniFile);
        }
    } else {
        Console.warningln("Neither .wcs nor .ini file was produced by ASTAP.");
    }
}

    try {
        if (File.exists(scriptFilePath))
            File.remove(scriptFilePath);
    } catch (error) {
        Console.warningln("Failed to remove script file: " + error.message);
    }

    return { jpgFile: jpgFile, wcsFile: wcsFile };
};

// New function: Parse calibration data from the ASTAP-solved FITS file.
BlindImageSolverDialog.prototype.parseASTAPCalibration = function(outputFiles) {
    let calibrationData = null;

    if (File.exists(outputFiles.wcsFile)) {
        try {
            // Read the raw content and convert to a string.
            let rawWcsText = File.readFile(outputFiles.wcsFile).toString();
            Console.writeln("Raw .wcs file text:\n" + rawWcsText);

            // Some FITS headers are stored as fixed-width 80-character cards.
            const cardLength = 80;
            let cards = [];
            for (let i = 0; i < rawWcsText.length; i += cardLength) {
                let card = rawWcsText.substring(i, i + cardLength).trim();
                if (card !== "")
                    cards.push(card);
            }
            Console.writeln("Total cards found: " + cards.length);
            for (let i = 0; i < cards.length; i++) {
                Console.writeln("Card " + i + ": " + cards[i]);
            }

            // Create an object to hold the header keywords.
            let wcsHeader = {};
            // Process each card.
            for (let i = 0; i < cards.length; i++) {
                let card = cards[i];
                // FITS cards typically end with the "END" card.
                if (card.startsWith("END")) {
                    break;
                }
                // Look for the '=' sign.
                if (card.indexOf("=") === -1)
                    continue;
                // FITS standard: keyword is in columns 1-8, then '=' in column 9.
                let key = card.substring(0,8).trim().toUpperCase();
                let valueStr = card.substring(10,80).trim(); // skip the '=' and a space
                // Remove any trailing comment: everything after a '/'.
                let parts = valueStr.split("/");
                let valuePart = parts[0].trim();
                // Remove surrounding quotes if present.
                if (valuePart.startsWith("'") && valuePart.endsWith("'"))
                    valuePart = valuePart.substring(1, valuePart.length - 1);
                wcsHeader[key] = valuePart;
                Console.writeln("Parsed card " + i + ": " + key + " = " + valuePart);
            }
            Console.noteln("Final parsed header:\n" + JSON.stringify(wcsHeader, null, 2));

            // Check for required keywords.
            if (!wcsHeader["CRVAL1"] || !wcsHeader["CRVAL2"] || !wcsHeader["CD1_1"]) {
                Console.warningln("Required WCS keywords not found in header.");
                return null;
            }

            let ra = parseFloat(wcsHeader["CRVAL1"]);
            let dec = parseFloat(wcsHeader["CRVAL2"]);
            let cd1_1 = parseFloat(wcsHeader["CD1_1"]);
            let cd1_2 = parseFloat(wcsHeader["CD1_2"]);
            let pixelScaleDeg = Math.sqrt(cd1_1 * cd1_1 + cd1_2 * cd1_2); // in deg/pixel
            let pixscale = pixelScaleDeg * 3600; // in arcsec/pixel
            calibrationData = {
                ra: ra,
                dec: dec,
                pixscale: pixscale,
                orientation: 0,
                parity: 1
            };
            Console.noteln("Calibration data computed:\n" + JSON.stringify(calibrationData, null, 2));
            return calibrationData;
        } catch (error) {
            Console.warningln("Error parsing .wcs file: " + error.message);
            return null;
        }
    } else {
        Console.warningln("No .wcs file found.");
        return null;
    }
};

// Main Execution
let dialog = new BlindImageSolverDialog();

dialog.execute();
