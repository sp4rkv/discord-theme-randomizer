/**
 * @name Discord Theme Randomizer
 * @author SP4RKV
 * @website https://sp4rkv.dev
 * @authorId 406167869521395715
 * @version 1.0.0
 * @description Randomly changes the active BetterDiscord theme at a selected time.
 */

"use strict";

module.exports = class DiscordThemeRandomizer {
    constructor() {
        this.pluginName = "Discord Theme Randomizer by SP4RKV";
        this.accentColor = "#A5E900";
        this.timer = null;
        this.defaultSettings = {
            intervalMinutes: 30,
            // Change this to the path to your themes.json file
            themesPath: "C:\\Users\\user\\AppData\\Roaming\\BetterDiscord\\data\\stable\\themes.json",
            randomizeOnStart: true
        };
    }

    start() {
        this.settings = this.loadSettings();
        this.log(`Starting. Interval: ${this.settings.intervalMinutes} minutes`);

        if (this.settings.randomizeOnStart) {
            this.randomizeTheme();
        }

        this.startTimer();
    }

    stop() {
        this.clearTimer();
        this.log("Stopped.");
    }

    getSettingsPanel() {
        const panel = document.createElement("div");
        panel.style.padding = "16px";
        panel.style.display = "flex";
        panel.style.flexDirection = "column";
        panel.style.gap = "12px";
        panel.style.borderLeft = `4px solid ${this.accentColor}`;
        panel.style.border = `1px solid rgba(165, 233, 0, 0.35)`;
        panel.style.borderRadius = "10px";
        panel.style.background = "rgba(165, 233, 0, 0.06)";
        panel.style.boxSizing = "border-box";

        const title = document.createElement("h3");
        title.textContent = this.pluginName;
        title.style.margin = "0 0 8px 0";
        title.style.color = this.accentColor;
        panel.appendChild(title);

        const pathLabel = document.createElement("label");
        pathLabel.textContent = "Path to themes.json:";
        pathLabel.style.fontWeight = "600";
        panel.appendChild(pathLabel);

        const pathInput = document.createElement("input");
        pathInput.type = "text";
        pathInput.value = this.settings.themesPath;
        pathInput.style.width = "100%";
        pathInput.style.padding = "8px";
        pathInput.style.borderRadius = "8px";
        pathInput.style.border = `1px solid rgba(165, 233, 0, 0.35)`;
        pathInput.style.background = "rgba(0,0,0,0.15)";
        pathInput.onchange = () => {
            this.settings.themesPath = pathInput.value.trim();
            this.saveSettings();
        };
        panel.appendChild(pathInput);

        const intervalLabel = document.createElement("label");
        intervalLabel.textContent = "Randomization interval (minutes):";
        intervalLabel.style.fontWeight = "600";
        panel.appendChild(intervalLabel);

        const intervalInput = document.createElement("input");
        intervalInput.type = "number";
        intervalInput.min = "1";
        intervalInput.step = "1";
        intervalInput.value = String(this.settings.intervalMinutes);
        intervalInput.style.width = "120px";
        intervalInput.style.padding = "8px";
        intervalInput.style.borderRadius = "8px";
        intervalInput.style.border = `1px solid rgba(165, 233, 0, 0.35)`;
        intervalInput.style.background = "rgba(0,0,0,0.15)";
        intervalInput.onchange = () => {
            const value = Number(intervalInput.value);
            if (!Number.isFinite(value) || value < 1) {
                intervalInput.value = String(this.settings.intervalMinutes);
                return;
            }
            this.settings.intervalMinutes = Math.floor(value);
            this.saveSettings();
            this.startTimer();
        };
        panel.appendChild(intervalInput);

        const startLabel = document.createElement("label");
        startLabel.style.display = "flex";
        startLabel.style.alignItems = "center";
        startLabel.style.gap = "8px";

        const startCheckbox = document.createElement("input");
        startCheckbox.type = "checkbox";
        startCheckbox.checked = Boolean(this.settings.randomizeOnStart);
        startCheckbox.style.accentColor = this.accentColor;
        startCheckbox.onchange = () => {
            this.settings.randomizeOnStart = Boolean(startCheckbox.checked);
            this.saveSettings();
        };

        const startText = document.createElement("span");
        startText.textContent = "Randomize theme on plugin start";
        startLabel.appendChild(startCheckbox);
        startLabel.appendChild(startText);
        panel.appendChild(startLabel);

        const randomizeNowBtn = document.createElement("button");
        randomizeNowBtn.textContent = "Randomize now";
        randomizeNowBtn.style.width = "fit-content";
        randomizeNowBtn.style.padding = "8px 12px";
        randomizeNowBtn.style.border = "none";
        randomizeNowBtn.style.borderRadius = "8px";
        randomizeNowBtn.style.background = this.accentColor;
        randomizeNowBtn.style.color = "#0b0b0b";
        randomizeNowBtn.style.fontWeight = "700";
        randomizeNowBtn.style.cursor = "pointer";
        randomizeNowBtn.onmouseenter = () => {
            randomizeNowBtn.style.filter = "brightness(0.95)";
        };
        randomizeNowBtn.onmouseleave = () => {
            randomizeNowBtn.style.filter = "none";
        };
        randomizeNowBtn.onclick = () => {
            this.randomizeTheme();
        };
        panel.appendChild(randomizeNowBtn);

        const info = document.createElement("div");
        info.style.fontSize = "12px";
        info.style.opacity = "0.8";
        info.textContent = "The plugin switches themes live via the BetterDiscord API and synchronizes themes.json.";
        panel.appendChild(info);

        return panel;
    }

    startTimer() {
        this.clearTimer();
        const intervalMs = Math.max(1, Number(this.settings.intervalMinutes)) * 60 * 1000;
        this.timer = setInterval(() => {
            this.randomizeTheme();
        }, intervalMs);
        this.log(`Timer set: ${intervalMs} ms`);
    }

    clearTimer() {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
    }

    randomizeTheme() {
        const fs = require("fs");

        try {
            if (!fs.existsSync(this.settings.themesPath)) {
                BdApi.UI.showToast(`[${this.pluginName}] Could not find themes.json`, {type: "error"});
                this.log(`Missing file: ${this.settings.themesPath}`);
                return;
            }

            const raw = fs.readFileSync(this.settings.themesPath, "utf8");
            const parsed = JSON.parse(raw);

            if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
                throw new Error("Invalid themes.json structure");
            }

            const entries = Object.entries(parsed).filter(([, value]) => typeof value === "boolean");
            if (!entries.length) {
                throw new Error("No themes available to randomize");
            }

            const currentlyEnabled = entries.filter(([, enabled]) => enabled).map(([name]) => name);
            let candidates = entries.map(([name]) => name);

            if (candidates.length > 1 && currentlyEnabled.length === 1) {
                candidates = candidates.filter((name) => name !== currentlyEnabled[0]);
            }

            const selectedTheme = candidates[Math.floor(Math.random() * candidates.length)];

            this.applyThemeRuntime(entries.map(([name]) => name), selectedTheme);

            for (const [name] of entries) {
                parsed[name] = false;
            }
            parsed[selectedTheme] = true;

            fs.writeFileSync(this.settings.themesPath, JSON.stringify(parsed, null, 4), "utf8");

            BdApi.UI.showToast(`[${this.pluginName}] Activated theme: ${selectedTheme}`, {type: "success"});
            this.log(`Activated: ${selectedTheme}`);
        } catch (error) {
            BdApi.UI.showToast(`[${this.pluginName}] Failed to change theme`, {type: "error"});
            this.log(`Error: ${error?.message || error}`);
            console.error(`[${this.pluginName}]`, error);
        }
    }

    applyThemeRuntime(allThemeNames, selectedTheme) {
        if (!BdApi?.Themes) {
            this.log("BdApi.Themes is unavailable - skipping live theme switching.");
            return;
        }

        for (const name of allThemeNames) {
            try {
                BdApi.Themes.disable(name);
            } catch (error) {
                this.log(`Failed to disable theme "${name}": ${error?.message || error}`);
            }
        }

        try {
            BdApi.Themes.enable(selectedTheme);
        } catch (error) {
            throw new Error(`Failed to enable theme "${selectedTheme}": ${error?.message || error}`);
        }
    }

    loadSettings() {
        const saved = BdApi.Data.load(this.pluginName, "settings");
        return Object.assign({}, this.defaultSettings, saved || {});
    }

    saveSettings() {
        BdApi.Data.save(this.pluginName, "settings", this.settings);
    }

    log(message) {
        console.log(`[${this.pluginName}] ${message}`);
    }
};