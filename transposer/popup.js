document.addEventListener("DOMContentLoaded", () => {
    const btn = document.getElementById("pitch-change-btn");
    const transposeControls = document.getElementById("transpose-controls");
    const originalKeyInput = document.getElementById("original-key");
    const dropdownMenu = document.getElementById("pitch-select");

    generateDropDown("");

    chrome.storage.local.get(["pitchChange", "originalKey", "pitchShift"], (result) => {

        const value = result.pitchChange ?? false; 
        const originalKey = result.originalKey ?? "";

        btn.value = value;
        if (value) {
            btn.innerHTML = "<span class='status-dot'></span>Pitch change - on";
            transposeControls.classList.add("active");

        } else {
            btn.innerHTML = "<span class='status-dot'></span>Pitch change - off";
            transposeControls.classList.remove("active");
        }

        originalKeyInput.value = originalKey;
        generateDropDown(originalKey);
    });

    function generateDropDown(key) {
        const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
        const originalKeyIndex = notes.findIndex(note => note === key.toUpperCase());

        dropdownMenu.innerHTML = "<option value=''>Select transpose</option>";

        if (originalKeyIndex === -1) {
            for (let i = -6; i < 7; i++) {
                if (i === 0) continue;
                const option = document.createElement("option");
                option.value = i;
                option.textContent = i > 0
                    ? `+${i} semitone${i > 1 ? 's' : ''}`
                    : `${i} semitone${i < -1 ? 's' : ''}`;
                dropdownMenu.appendChild(option);
            }
            chrome.storage.local.get(["pitchShift"], (result) => { dropdownMenu.value = (result.pitchShift ?? "").toString(); });
            return; 
        }

        for (let i = -6; i < 7; i++) {
            if (i === 0) continue;

            const option = document.createElement("option");
            const newKey = notes[((originalKeyIndex + i) % 12 + 12) % 12];
            const direction = i > 0 ? `+${i}` : `${i}`;
            const semitoneLabel = Math.abs(i) === 1 ? "semitone" : "semitones";

            option.value = i;
            option.textContent = `${direction} ${semitoneLabel} (${key} → ${newKey})`;

            dropdownMenu.appendChild(option);

            chrome.storage.local.get(["pitchShift"], (result) => { dropdownMenu.value = (result.pitchShift ?? "").toString(); });
        }
    }

    originalKeyInput.addEventListener("change", () => {
        const key = originalKeyInput.value.toUpperCase();
        console.log("Original key entered : ", key);
        chrome.storage.local.set({ originalKey: key });
        generateDropDown(key);
    });

    btn.addEventListener("click", () => {
        const currentValue = btn.value === "true";
        const newValue = !currentValue;
        btn.value = newValue.toString();

        if (newValue) {
            btn.innerHTML = "<span class='status-dot'></span>Pitch change - on";
            transposeControls.classList.add("active");

            chrome.storage.local.get(["pitchValue"], (result) => {
                const storedPitch = result.pitchValue ?? 1.0;

                chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                    chrome.tabs.sendMessage(tabs[0].id, {
                        pitchChange: true,
                        pitchValue: storedPitch
                    });
                });
            });

        } else {
            btn.innerHTML = "<span class='status-dot'></span>Pitch change - off";
            transposeControls.classList.remove("active");

            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                chrome.tabs.sendMessage(tabs[0].id, {
                    pitchChange: false
                });
            });
        }

        chrome.storage.local.set({ pitchChange: newValue });
    });

    dropdownMenu.addEventListener("change", () => {
        const shift = parseInt(dropdownMenu.value) || 0;
        const pitchValue = Math.pow(2, shift / 12);

        console.log("User selected shift:", shift, "→ pitchValue:", pitchValue);

        chrome.storage.local.set({ pitchValue, pitchShift : shift});

        // Only send to content script if pitch change is ON
        chrome.storage.local.get(["pitchChange"], (result) => {
            if (result.pitchChange === true) {
                chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                    chrome.tabs.sendMessage(tabs[0].id, {
                        pitchChange: true,
                        pitchValue: pitchValue
                    });
                });
            }
        });
    });
});

