// ==UserScript==
// @name         Instagram Auto Reels Scroller
// @namespace    http://tampermonkey.net/
// @version      1.0.0
// @description  Automatically scroll to the next Instagram Reel when one ends. Simple version with toggle functionality.
// @author       Tyson3101 (converted to Userscript by ShubhamJ010)
// @match        https://www.instagram.com/reels/*
// @match        https://www.instagram.com/reel/*
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_addValueChangeListener
// @grant        GM_registerMenuCommand
// @icon         https://i.pinimg.com/736x/8f/94/c6/8f94c616ec0a60bafb4de4e0260719da.jpg
// @run-at       document-start
// ==/UserScript==

(function() {
    'use strict';

    // Default settings
    const DEFAULT_SETTINGS = {
        applicationIsOn: true,
        scrollDirection: "down",  // "down" or "up"
        amountOfPlays: 1,         // Number of times to play before scrolling
        shortCut: ["shift", "s"], // Toggle keyboard shortcut
        scrollOnComments: true    // Whether to scroll when comments are open
    };

    // DOM selectors
    const VIDEOS_LIST_SELECTOR = "main video";
    const COMMENTS_SELECTOR = ".BasePortal span";

    // State variables
    let applicationIsOn = GM_getValue("applicationIsOn", DEFAULT_SETTINGS.applicationIsOn);
    let amountOfPlays = 0;  // Counter for plays

    // Utility function to sleep
    const sleep = (milliseconds) => {
        return new Promise((resolve) => setTimeout(resolve, milliseconds));
    };

    // Settings change listener for applicationIsOn
    GM_addValueChangeListener("applicationIsOn", (name, oldVal, newVal, remote) => {
        applicationIsOn = newVal;
        updateStatusIndicator();
        console.log(`Auto Instagram Reels Scroller status: ${applicationIsOn ? "ON" : "OFF"}`);
    });

    // Function to start auto scrolling
    function startAutoScrolling() {
        applicationIsOn = true;
        GM_setValue("applicationIsOn", true);
        updateStatusIndicator();
        console.log("Auto Instagram Reels Scroller: ON");
    }

    // Function to stop auto scrolling
    function stopAutoScrolling() {
        applicationIsOn = false;
        const currentVideo = getCurrentVideo();
        if (currentVideo) {
            currentVideo.setAttribute("loop", "true");
        }
        GM_setValue("applicationIsOn", false);
        updateStatusIndicator();
        console.log("Auto Instagram Reels Scroller: OFF");
    }

    // Function that handles the end of a video
    async function endVideoEvent() {
        const VIDEOS_LIST = Array.from(
            document.querySelectorAll(VIDEOS_LIST_SELECTOR)
        );

        const currentVideo = getCurrentVideo();
        if (!currentVideo) return;

        if (!applicationIsOn) {
            currentVideo?.setAttribute("loop", "true");
            return;
        }

        amountOfPlays++;
        // With default settings, always scroll after one play
        if (amountOfPlays < DEFAULT_SETTINGS.amountOfPlays) return;

        const index = VIDEOS_LIST.findIndex(
            (vid) => vid.src && vid.src === currentVideo.src
        );
        let nextVideo = VIDEOS_LIST[index + (DEFAULT_SETTINGS.scrollDirection === "down" ? 1 : -1)];

        if (!DEFAULT_SETTINGS.scrollOnComments && checkIfCommentsAreOpen()) {
            currentVideo.pause();
            let checkInterval = setInterval(() => {
                if (DEFAULT_SETTINGS.scrollOnComments || !checkIfCommentsAreOpen()) {
                    scrollToNextVideo();
                    clearInterval(checkInterval);
                }
            }, 100);
        } else {
            scrollToNextVideo();
        }

        function scrollToNextVideo() {
            if (nextVideo) {
                amountOfPlays = 0;
                nextVideo.scrollIntoView({
                    behavior: "smooth",
                    inline: "center",
                    block: "center",
                });
            }
        }
    }

    // Function to get current video that's in view
    function getCurrentVideo() {
        const videos = Array.from(document.querySelectorAll(VIDEOS_LIST_SELECTOR));
        return videos.find((video) => {
            const videoRect = video.getBoundingClientRect();

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

    // Function to check if comments are open
    function checkIfCommentsAreOpen() {
        const comments = document.querySelector(COMMENTS_SELECTOR);
        return !!(comments && comments.textContent && comments.textContent.length);
    }

    // Main loop function
    (async function loop() {
        (function addVideoEndEvent() {
            if (applicationIsOn) {
                const currentVideo = getCurrentVideo();
                if (currentVideo) {
                    currentVideo.removeAttribute("loop");
                    // Remove existing event listener to prevent duplicates
                    currentVideo.removeEventListener("ended", endVideoEvent);
                    currentVideo.addEventListener("ended", endVideoEvent);
                }
            } else {
                // If disabled, remove event listeners from current videos
                const currentVideo = getCurrentVideo();
                if (currentVideo) {
                    currentVideo.setAttribute("loop", "true");
                    currentVideo.removeEventListener("ended", endVideoEvent);
                }
            }
        })();

        await sleep(100);
        requestAnimationFrame(loop);
    })();

    // Keyboard shortcut listener
    (function shortCutListener() {
        const pressedKeys = [];
        const debounceDelay = 700;

        function debounce(cb, delay) {
            let timeout;

            return (...args) => {
                clearTimeout(timeout);
                timeout = setTimeout(() => {
                    cb(...args);
                }, delay);
            };
        }

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

        document.addEventListener("keydown", async (e) => {
            if (!e.key) return;
            pressedKeys.push(e.key.toLowerCase());

            if (await checkKeys(DEFAULT_SETTINGS.shortCut)) {
                if (applicationIsOn) {
                    stopAutoScrolling();
                } else {
                    startAutoScrolling();
                }
            }
            pressedKeys.length = 0; // Clear the array
        });
    })();

    // Create visual status indicator
    function createStatusIndicator() {
        // Remove existing indicator if it exists
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

    // Initialize the status indicator
    createStatusIndicator();

    // Update the status indicator when the setting changes
    function updateStatusIndicator() {
        const indicator = document.getElementById('auto-reels-status-indicator');
        if (indicator) {
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
            createStatusIndicator();
        }
    }

    // Initialize the script
    console.log(`Auto Instagram Reels Scroller is Running\nStatus: ${applicationIsOn ? "ON" : "OFF"}`);

    // Add Tampermonkey menu commands
    GM_registerMenuCommand("Toggle Auto Scroll", () => {
        if (applicationIsOn) {
            stopAutoScrolling();
        } else {
            startAutoScrolling();
        }
    });
})();