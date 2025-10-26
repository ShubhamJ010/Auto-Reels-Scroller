// ==UserScript==
// @name         Instagram Auto Reels Scroller
// @namespace    http://tampermonkey.net/
// @version      1.1.0
// @description  Automatically scroll to the next Instagram Reel when one ends. Enhanced with visual ON/OFF indicator and settings panel. Compatible with Tampermonkey, Greasemonkey, and Violentmonkey.
// @author       Tyson3101 (converted to Userscript by Qwen)
// @match        https://www.instagram.com/reels/*
// @match        https://www.instagram.com/reel/*
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_addValueChangeListener
// @grant        GM_registerMenuCommand
// @icon         https://i.pinimg.com/736x/8f/94/c6/8f94c616ec0a60bafb4de4e0260719da.jpg
// @run-at       document-start
// ==/UserScript==

/*
 * Instagram Auto Reels Scroller - Userscript Version
 * 
 * This script provides automatic scrolling functionality for Instagram Reels,
 * similar to the original Chrome Extension but designed to work with userscript managers
 * such as Tampermonkey, Greasemonkey, and Violentmonkey.
 * 
 * Features:
 * - Auto-scroll to next reel when current one ends
 * - Toggle functionality (ON/OFF)
 * - Configurable settings (direction, plays before scroll, etc.)
 * - Visual status indicator (ON/OFF)
 * - Keyboard shortcut (default: Shift+S)
 * - Settings panel
 * 
 * Compatible with:
 * - Tampermonkey (Chrome/Edge)
 * - Greasemonkey (Firefox) 
 * - Violentmonkey (Cross-browser)
 */

(function() {
    'use strict';

    /**
     * Default settings for the Instagram Auto Reels Scroller
     * These values are used when no stored settings exist
     */
    const SETTINGS_DEFAULTS = {
        applicationIsOn: true,        // Whether the auto-scroll feature is enabled
        scrollDirection: "down",      // Direction to scroll: "down" or "up" 
        amountOfPlays: 1,             // Number of times to play a reel before scrolling
        shortCut: ["shift", "s"],     // Keyboard shortcut to toggle the feature
        scrollOnComments: true        // Whether to scroll when comments are open
    };

    // DOM selectors for identifying Instagram reels and comments
    const VIDEOS_LIST_SELECTOR = "main video";  // Selector for video elements in reels
    const COMMENTS_SELECTOR = ".BasePortal span";  // Selector for comment elements

    // State variables - track the current state of the script
    let applicationIsOn = GM_getValue("applicationIsOn", SETTINGS_DEFAULTS.applicationIsOn);
    let scrollDirection = GM_getValue("scrollDirection", SETTINGS_DEFAULTS.scrollDirection);
    let amountOfPlaysToSkip = GM_getValue("amountOfPlays", SETTINGS_DEFAULTS.amountOfPlays);
    let shortCutToggleKeys = GM_getValue("shortCut", SETTINGS_DEFAULTS.shortCut);
    let scrollOnComments = GM_getValue("scrollOnComments", SETTINGS_DEFAULTS.scrollOnComments);
    let amountOfPlays = 0;  // Counter for how many times current video has played

    /**
     * Utility function to create a delay
     * @param {number} milliseconds - Number of milliseconds to wait
     * @returns {Promise} Promise that resolves after the specified time
     */
    const sleep = (milliseconds) => {
        return new Promise((resolve) => setTimeout(resolve, milliseconds));
    };

    /**
     * Settings change listeners
     * These functions update the local variables when settings are changed
     * in another tab or through the settings UI
     */
    GM_addValueChangeListener("applicationIsOn", (name, oldVal, newVal, remote) => {
        applicationIsOn = newVal;
        // Update the visual indicator when the status changes
        updateStatusIndicator();
        console.log(`Auto Instagram Reels Scroller status: ${applicationIsOn ? "ON" : "OFF"}`);
    });

    GM_addValueChangeListener("scrollDirection", (name, oldVal, newVal, remote) => {
        scrollDirection = newVal;
    });

    GM_addValueChangeListener("amountOfPlays", (name, oldVal, newVal, remote) => {
        amountOfPlaysToSkip = newVal;
    });

    GM_addValueChangeListener("shortCut", (name, oldVal, newVal, remote) => {
        shortCutToggleKeys = newVal;
    });

    GM_addValueChangeListener("scrollOnComments", (name, oldVal, newVal, remote) => {
        scrollOnComments = newVal;
    });

    /**
     * Starts the auto-scrolling functionality
     * Enables the feature and updates the stored setting
     */
    function startAutoScrolling() {
        applicationIsOn = true;
        GM_setValue("applicationIsOn", true);
        updateStatusIndicator();
        console.log("Auto Instagram Reels Scroller: ON");
    }

    /**
     * Stops the auto-scrolling functionality
     * Disables the feature, updates the stored setting, and enables video looping
     */
    function stopAutoScrolling() {
        applicationIsOn = false;
        const currentVideo = getCurrentVideo();
        if (currentVideo) {
            // Enable looping when the feature is turned off to prevent auto-scrolling
            currentVideo.setAttribute("loop", "true");
        }
        GM_setValue("applicationIsOn", false);
        updateStatusIndicator();
        console.log("Auto Instagram Reels Scroller: OFF");
    }

    /**
     * Handles the event when a video ends
     * Determines whether to scroll to the next video based on settings
     */
    async function endVideoEvent() {
        console.log({
            amountOfPlays,
            amountOfPlaysToSkip,
            scrollDirection,
            applicationIsOn,
            currentVideo: getCurrentVideo(),
        });

        // Get all video elements on the page
        const VIDEOS_LIST = Array.from(
            document.querySelectorAll(VIDEOS_LIST_SELECTOR)
        );

        const currentVideo = getCurrentVideo();
        if (!currentVideo) return;

        // If the feature is disabled, make the video loop instead of scrolling
        if (!applicationIsOn) {
            currentVideo?.setAttribute("loop", "true");
        }

        // Increment the play counter
        amountOfPlays++;
        // Check if we've played enough times before scrolling
        if (amountOfPlays < amountOfPlaysToSkip) return;

        // Find the index of the current video in the list
        const index = VIDEOS_LIST.findIndex(
            (vid) => vid.src && vid.src === currentVideo.src
        );
        // Determine the next video based on scroll direction
        let nextVideo = VIDEOS_LIST[index + (scrollDirection === "down" ? 1 : -1)];

        // Check if comments are open and if we should wait before scrolling
        if (!scrollOnComments && checkIfCommentsAreOpen()) {
            // Pause the current video and wait for comments to close
            currentVideo.pause();
            let checkInterval = setInterval(() => {
                // Scroll when comments are closed or when the setting allows scrolling with comments open
                if (scrollOnComments || !checkIfCommentsAreOpen()) {
                    scrollToNextVideo();
                    clearInterval(checkInterval);
                }
            }, 100);
        } else {
            // Scroll immediately to the next video
            scrollToNextVideo();
        }

        /**
         * Scrolls to the next video in the sequence
         * Resets the play counter after scrolling
         */
        function scrollToNextVideo() {
            if (nextVideo) {
                amountOfPlays = 0; // Reset the play counter
                // Scroll smoothly to the next video
                nextVideo.scrollIntoView({
                    behavior: "smooth",
                    inline: "center",
                    block: "center",
                });
            }
        }
    }

    /**
     * Gets the currently visible video element
     * Uses viewport intersection to determine which video is currently in view
     * @returns {HTMLVideoElement|null} The visible video element or null if none found
     */
    function getCurrentVideo() {
        const videos = Array.from(document.querySelectorAll(VIDEOS_LIST_SELECTOR));
        return videos.find((video) => {
            const videoRect = video.getBoundingClientRect();

            // Check if the video element is within the viewport
            const isVideoInView =
                videoRect.top >= 0 &&
                videoRect.left >= 0 &&
                videoRect.bottom <=
                  (window.innerHeight || document.documentElement.clientHeight) &&
                videoRect.right <=
                  (window.innerWidth || document.documentElement.clientWidth);

            return isVideoInView;
        }) || null;
    }

    /**
     * Checks if comments are currently open on the page
     * @returns {boolean} True if comments are open, false otherwise
     */
    function checkIfCommentsAreOpen() {
        const comments = document.querySelector(COMMENTS_SELECTOR);
        return !!(comments && comments.textContent && comments.textContent.length);
    }

    /**
     * Main loop function that continuously monitors for video elements
     * Adds event listeners to videos when the feature is enabled
     */
    (async function loop() {
        (function addVideoEndEvent() {
            if (applicationIsOn) {
                const currentVideo = getCurrentVideo();
                if (currentVideo) {
                    // Remove the loop attribute to allow the ended event to fire
                    currentVideo.removeAttribute("loop");
                    // Remove existing event listener to prevent duplicates
                    currentVideo.removeEventListener("ended", endVideoEvent);
                    // Add the event listener for when the video ends
                    currentVideo.addEventListener("ended", endVideoEvent);
                }
            }
        })();

        // Wait before the next iteration to avoid excessive processing
        await sleep(100);
        // Use requestAnimationFrame for efficient looping
        requestAnimationFrame(loop);
    })();

    /**
     * Keyboard shortcut listener
     * Listens for key combinations to toggle the auto-scroll feature
     * Uses a debounced approach to properly detect chorded key combinations
     */
    (function shortCutListener() {
        const pressedKeys = [];  // Array to store currently pressed keys
        const debounceDelay = 700;  // Delay to prevent multiple triggers

        /**
         * Debounces a function call
         * @param {Function} cb - Callback function to debounce
         * @param {number} delay - Delay in milliseconds
         * @returns {Function} Debounced function
         */
        function debounce(cb, delay) {
            let timeout;

            return (...args) => {
                clearTimeout(timeout);
                timeout = setTimeout(() => {
                    cb(...args);
                }, delay);
            };
        }

        /**
         * Checks if the currently pressed keys match the configured shortcut
         * @param {string[]} keysToCheck - Array of keys that make up the shortcut
         * @returns {Promise<boolean>} Promise that resolves to true if keys match
         */
        const checkKeys = (keysToCheck) => {
            return new Promise((resolve) => {
                function debounceCB() {
                    if (pressedKeys.length === keysToCheck.length) {
                        let match = true;
                        for (let i = 0; i < pressedKeys.length; i++) {
                            if (pressedKeys[i] !== keysToCheck[i]) {
                                match = false;
                                break;
                            }
                        }
                        resolve(match);
                    } else resolve(false);
                }
                debounce(debounceCB, debounceDelay)();
            });
        };

        // Add keydown event listener to detect the keyboard shortcut
        document.addEventListener("keydown", async (e) => {
            if (!e.key) return;
            // Add the pressed key to the array (converted to lowercase for comparison)
            pressedKeys.push(e.key.toLowerCase());

            // Check if the currently pressed keys match the shortcut
            if (await checkKeys(shortCutToggleKeys)) {
                // Toggle the auto-scroll feature
                if (applicationIsOn) {
                    stopAutoScrolling();
                } else {
                    startAutoScrolling();
                }
            }
            // Clear the pressed keys array after processing
            pressedKeys.length = 0;
        });
    })();

    // Initialize the script
    console.log(`Auto Instagram Reels Scroller is Running\nStatus: ${applicationIsOn ? "ON" : "OFF"}`);

    // Add Tampermonkey menu commands for quick toggle
    GM_registerMenuCommand("Toggle Auto Scroll", () => {
        if (applicationIsOn) {
            stopAutoScrolling();
        } else {
            startAutoScrolling();
        }
    });

    GM_registerMenuCommand("Settings", () => {
        showSettingsUI();
    });

    /**
     * Creates the visual status indicator element
     * Displays "Auto ON" or "Auto OFF" in the top-right corner of the page
     */
    function createStatusIndicator() {
        // Remove existing indicator if it exists to prevent duplicates
        const existingIndicator = document.getElementById('auto-reels-status-indicator');
        if (existingIndicator) {
            existingIndicator.remove();
        }
        
        const indicator = document.createElement('div');
        indicator.id = 'auto-reels-status-indicator';
        indicator.innerHTML = `
            <div style="
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 999999;
                background: ${applicationIsOn ? '#4CAF50' : '#f44336'};
                color: white;
                padding: 8px 12px;
                border-radius: 20px;
                font-family: Arial, sans-serif;
                font-size: 14px;
                font-weight: bold;
                box-shadow: 0 2px 10px rgba(0,0,0,0.3);
                display: flex;
                align-items: center;
                gap: 8px;
            ">
                <span style="
                    display: inline-block;
                    width: 12px;
                    height: 12px;
                    border-radius: 50%;
                    background: white;
                    position: relative;
                ">
                    <span style="
                        position: absolute;
                        top: 2px;
                        left: 2px;
                        width: 8px;
                        height: 8px;
                        border-radius: 50%;
                        background: ${applicationIsOn ? '#4CAF50' : '#f44336'};
                    "></span>
                </span>
                Auto ${applicationIsOn ? 'ON' : 'OFF'}
            </div>
        `;
        document.body.appendChild(indicator);
    }

    // Initialize the status indicator when the script loads
    createStatusIndicator();

    /**
     * Updates the visual status indicator to reflect the current state
     * Changes color and text based on whether the feature is enabled or disabled
     */
    function updateStatusIndicator() {
        const indicator = document.getElementById('auto-reels-status-indicator');
        if (indicator) {
            // Update the indicator with the current status
            indicator.innerHTML = `
                <div style="
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    z-index: 999999;
                    background: ${applicationIsOn ? '#4CAF50' : '#f44336'};
                    color: white;
                    padding: 8px 12px;
                    border-radius: 20px;
                    font-family: Arial, sans-serif;
                    font-size: 14px;
                    font-weight: bold;
                    box-shadow: 0 2px 10px rgba(0,0,0,0.3);
                    display: flex;
                    align-items: center;
                    gap: 8px;
                ">
                    <span style="
                        display: inline-block;
                        width: 12px;
                        height: 12px;
                        border-radius: 50%;
                        background: white;
                        position: relative;
                    ">
                        <span style="
                            position: absolute;
                            top: 2px;
                            left: 2px;
                            width: 8px;
                            height: 8px;
                            border-radius: 50%;
                            background: ${applicationIsOn ? '#4CAF50' : '#f44336'};
                        "></span>
                    </span>
                    Auto ${applicationIsOn ? 'ON' : 'OFF'}
                </div>
            `;
        } else {
            // If the indicator doesn't exist, create it
            createStatusIndicator();
        }
    }

    /**
     * Creates and displays the settings UI
     * Provides controls for all configurable options
     */
    function showSettingsUI() {
        const settingsHTML = `
            <div id="instagram-auto-reels-settings" style="position: fixed; top: 20%; left: 50%; transform: translateX(-50%); background: white; padding: 20px; border: 2px solid #333; border-radius: 10px; z-index: 10000; box-shadow: 0 4px 8px rgba(0,0,0,0.3); font-family: Arial, sans-serif; max-width: 500px; width: 90%;">
                <h2 style="margin-top: 0; text-align: center;">Auto Reels Scroller Settings</h2>
                
                <div style="margin-bottom: 15px;">
                    <label><strong>Scroll Direction:</strong></label>
                    <select id="scrollDirectionSetting" style="margin-left: 10px; padding: 5px;">
                        <option value="down" ${scrollDirection === "down" ? "selected" : ""}>Down</option>
                        <option value="up" ${scrollDirection === "up" ? "selected" : ""}>Up</option>
                    </select>
                </div>
                
                <div style="margin-bottom: 15px;">
                    <label><strong>Amount of Plays Before Scrolling:</strong></label>
                    <input type="number" id="amountOfPlaysSetting" value="${amountOfPlaysToSkip}" min="1" style="margin-left: 10px; padding: 5px; width: 60px;">
                </div>
                
                <div style="margin-bottom: 15px;">
                    <label><strong>Scroll When Comments are Open:</strong></label>
                    <select id="scrollOnCommentsSetting" style="margin-left: 10px; padding: 5px;">
                        <option value="true" ${scrollOnComments === true ? "selected" : ""}>Yes</option>
                        <option value="false" ${scrollOnComments === false ? "selected" : ""}>No</option>
                    </select>
                </div>
                
                <div style="margin-bottom: 15px;">
                    <label><strong>Toggle Shortcut (e.g. shift+s):</strong></label>
                    <input type="text" id="shortCutSetting" value="${shortCutToggleKeys.join('+')}" style="margin-left: 10px; padding: 5px; width: 100px;">
                </div>
                
                <div style="text-align: center; margin-top: 20px;">
                    <button id="saveSettingsBtn" style="padding: 8px 15px; margin-right: 10px; background: #4CAF50; color: white; border: none; border-radius: 4px; cursor: pointer;">Save</button>
                    <button id="closeSettingsBtn" style="padding: 8px 15px; background: #f44336; color: white; border: none; border-radius: 4px; cursor: pointer;">Close</button>
                </div>
            </div>
            
            <div id="settings-overlay" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 9999;"></div>
        `;
        
        // Add the settings UI to the page
        document.body.insertAdjacentHTML('beforeend', settingsHTML);
        
        // Add event listeners for the close button and overlay
        document.getElementById('closeSettingsBtn').addEventListener('click', closeSettings);
        document.getElementById('settings-overlay').addEventListener('click', closeSettings);
        
        // Add event listener for the save button
        document.getElementById('saveSettingsBtn').addEventListener('click', saveSettings);
        
        /**
         * Closes the settings UI and removes it from the page
         */
        function closeSettings() {
            const settingsDiv = document.getElementById('instagram-auto-reels-settings');
            const overlay = document.getElementById('settings-overlay');
            if (settingsDiv) settingsDiv.remove();
            if (overlay) overlay.remove();
            // Update status indicator when closing settings
            updateStatusIndicator();
        }
        
        /**
         * Saves the settings to storage and updates the script state
         */
        function saveSettings() {
            // Get updated values from the form
            const newScrollDirection = document.getElementById('scrollDirectionSetting').value;
            const newAmountOfPlays = parseInt(document.getElementById('amountOfPlaysSetting').value);
            const newScrollOnComments = document.getElementById('scrollOnCommentsSetting').value === "true";
            const newShortCut = document.getElementById('shortCutSetting').value.toLowerCase().split('+');
            
            // Update global variables with new values
            scrollDirection = newScrollDirection;
            amountOfPlaysToSkip = newAmountOfPlays;
            scrollOnComments = newScrollOnComments;
            shortCutToggleKeys = newShortCut;
            
            // Save settings to persistent storage
            GM_setValue("scrollDirection", newScrollDirection);
            GM_setValue("amountOfPlays", newAmountOfPlays);
            GM_setValue("scrollOnComments", newScrollOnComments);
            GM_setValue("shortCut", newShortCut);
            
            // Close the settings UI
            closeSettings();
            
            alert("Settings saved successfully!");
        }
    }

    // Update status indicator when settings change
    // This ensures the visual indicator reflects the applicationIsOn status
    GM_addValueChangeListener("applicationIsOn", (name, oldVal, newVal, remote) => {
        applicationIsOn = newVal;
        console.log(`Auto Instagram Reels Scroller status: ${applicationIsOn ? "ON" : "OFF"}`);
        updateStatusIndicator();
    });

    // Add Tampermonkey menu commands for quick access to features
    GM_registerMenuCommand("Toggle Auto Scroll", () => {
        if (applicationIsOn) {
            stopAutoScrolling();
        } else {
            startAutoScrolling();
        }
    });

    GM_registerMenuCommand("Settings", () => {
        showSettingsUI();
    });

})();