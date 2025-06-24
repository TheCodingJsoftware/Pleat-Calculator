import "beercss"
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyAyMJKhhAu7OP0E8MycITIZ0OEnBrPKG9A",
  authDomain: "pleatcalculator.firebaseapp.com",
  projectId: "pleatcalculator",
  storageBucket: "pleatcalculator.firebasestorage.app",
  messagingSenderId: "381653396309",
  appId: "1:381653396309:web:6a9e9c732a25261a75dddc",
  measurementId: "G-7YPP3S0K00"
};

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
}

let deferredPrompt: BeforeInstallPromptEvent | null = null;

// Simple mobile device check
const isMobile = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);

function inchesToCentimeters(inches: number, decimals: number = 2): string {
    const cm = inches * 2.54;
    return cm.toFixed(decimals);
}

function roundToSixteenthAndFormat(value: number): string {
    const rounded = Math.round(value * 16);
    const whole = Math.floor(rounded / 16);
    const remainder = rounded % 16;

    const fractionMap: { [key: number]: string } = {
        1: "1/16",
        2: "1/8",
        3: "3/16",
        4: "1/4",
        5: "5/16",
        6: "3/8",
        7: "7/16",
        8: "1/2",
        9: "9/16",
        10: "5/8",
        11: "11/16",
        12: "3/4",
        13: "13/16",
        14: "7/8",
        15: "15/16"
    };

    if (remainder === 0) {
        return `${whole}`;
    } else if (whole === 0) {
        return `${fractionMap[remainder]}`;
    } else {
        return `${whole} ${fractionMap[remainder]}`;
    }
}


function calculatePleatUnderlap(pleatWidth: number, pleatCount: number, totalMaterial: number) {
    const totalPleatWidth = pleatWidth * pleatCount;
    const materialLeft = totalMaterial - totalPleatWidth;
    const underlap = materialLeft / pleatCount;
    return underlap;
}

function calculatePleatWidth(pleatCount: number, waistCircumference: number) {
    return waistCircumference / pleatCount;
}

function calculatePleatCount(waistCircumference: number, pleatWidth: number) {
    return waistCircumference / pleatWidth;
}

function calculateTotalMaterial(pleatWidth: number, pleatCount: number, pleatUnderlap: number): number {
    const totalPleatWidth = pleatWidth * pleatCount;
    const materialLeft = pleatUnderlap * pleatCount;
    return totalPleatWidth + materialLeft;
}

function updateHelperText(input: HTMLInputElement, helper: HTMLSpanElement) {
    helper.innerText = `${roundToSixteenthAndFormat(Number(input.value))} inches (${inchesToCentimeters(Number(input.value))} cm)`;
}

function saveToLocalStorage(input: HTMLInputElement) {
    localStorage.setItem(input.id, input.value);
}

function loadFromLocalStorage(input: HTMLInputElement) {
    const value = localStorage.getItem(input.id);
    if (value) {
        input.value = value;
    }
}

function registerStepButtons(input: HTMLInputElement, addBtn: HTMLButtonElement, removeBtn: HTMLButtonElement, decimals: number) {
  const adjust = (btn: HTMLButtonElement, direction: number) => {
    const span = btn.querySelector("span") as HTMLSpanElement;
    const step = Number(span.dataset.value);
    const newValue = Number(input.value) + direction * step;
    input.value = newValue.toFixed(decimals);
    input.dispatchEvent(new Event("input"));
  };

  addBtn.addEventListener("click", () => adjust(addBtn, +1));
  removeBtn.addEventListener("click", () => adjust(removeBtn, -1));
}

document.addEventListener("DOMContentLoaded", () => {
    const app = initializeApp(firebaseConfig);
    const analytics = getAnalytics(app);

    const themeToggle = document.getElementById("theme-toggle") as HTMLInputElement;
    const installPWA = document.getElementById("install-pwa") as HTMLButtonElement;

    const inputs = {
        waist: document.getElementById("waist-cirumference") as HTMLInputElement,
        pleatWidth: document.getElementById("pleat-width") as HTMLInputElement,
        pleatCount: document.getElementById("pleat-count") as HTMLInputElement,
        totalMaterial: document.getElementById("total-material") as HTMLInputElement,
        pleatUnderlap: document.getElementById("pleat-underlap") as HTMLInputElement,
    };

    const helpers = {
        waist: document.getElementById("waist-circumference-helper") as HTMLSpanElement,
        pleatWidth: document.getElementById("pleat-width-helper") as HTMLSpanElement,
        totalMaterial: document.getElementById("total-material-helper") as HTMLSpanElement,
        pleatUnderlap: document.getElementById("pleat-underlap-helper") as HTMLSpanElement,
    };

    const buttons = {
        waist: {
        add: document.getElementById("waist-circumference-add") as HTMLButtonElement,
        minus: document.getElementById("waist-circumference-minus") as HTMLButtonElement,
        decimals: 2,
        },
        pleatWidth: {
        add: document.getElementById("pleat-width-add") as HTMLButtonElement,
        minus: document.getElementById("pleat-width-minus") as HTMLButtonElement,
        decimals: 4,
        },
        pleatCount: {
        add: document.getElementById("pleat-count-add") as HTMLButtonElement,
        minus: document.getElementById("pleat-count-minus") as HTMLButtonElement,
        decimals: 0,
        },
        totalMaterial: {
        add: document.getElementById("total-material-add") as HTMLButtonElement,
        minus: document.getElementById("total-material-minus") as HTMLButtonElement,
        decimals: 2,
        },
        pleatUnderlap: {
        add: document.getElementById("pleat-underlap-add") as HTMLButtonElement,
        minus: document.getElementById("pleat-underlap-minus") as HTMLButtonElement,
        decimals: 4,
        },
    };
    function loadAllInputs() {
        Object.values(inputs).forEach(loadFromLocalStorage);
    }

    function saveAllInputs() {
        Object.values(inputs).forEach(saveToLocalStorage);
    }

    function updateAllHelpers() {
        updateHelperText(inputs.waist, helpers.waist);
        updateHelperText(inputs.pleatWidth, helpers.pleatWidth);
        updateHelperText(inputs.totalMaterial, helpers.totalMaterial);
        updateHelperText(inputs.pleatUnderlap, helpers.pleatUnderlap);
    }

    if (localStorage.getItem("theme") === "dark") {
        document.body.classList.add("dark");
        themeToggle.checked = true;
    }

    themeToggle.addEventListener("change", () => {
        document.body.classList.toggle("dark");
        localStorage.setItem("theme", themeToggle.checked ? "dark" : "light");
    });

    window.addEventListener("beforeinstallprompt", (e: Event) => {
        e.preventDefault();
        deferredPrompt = e as BeforeInstallPromptEvent;

        if (isMobile) {
            installPWA.style.display = "block";
        }else{
            installPWA.style.display = "none";
        }
    });

    installPWA.addEventListener("click", async () => {
        if (deferredPrompt) {
            deferredPrompt.prompt();
            const choiceResult = await deferredPrompt.userChoice;

            if (choiceResult.outcome === "accepted") {
                console.log("User accepted the A2HS prompt");
            } else {
                console.log("User dismissed the A2HS prompt");
            }

            deferredPrompt = null;
            installPWA.style.display = "none";
        }
    });

    inputs.waist.addEventListener("input", () => {
        const pleatCount = Number(calculatePleatCount(Number(inputs.waist.value), Number(inputs.pleatWidth.value)).toFixed(0));
        inputs.pleatCount.value = pleatCount.toFixed(0);
        inputs.pleatUnderlap.value = calculatePleatUnderlap(Number(inputs.pleatWidth.value), pleatCount, Number(inputs.totalMaterial.value)).toFixed(4);

        updateAllHelpers();
        saveAllInputs();
    });

    inputs.pleatWidth.addEventListener("input", () => {
        const pleatCount = Number(calculatePleatCount(Number(inputs.waist.value), Number(inputs.pleatWidth.value)).toFixed(0));
        inputs.pleatCount.value = pleatCount.toFixed(0);
        inputs.pleatUnderlap.value = calculatePleatUnderlap(Number(inputs.pleatWidth.value), Number(inputs.pleatCount.value), Number(inputs.totalMaterial.value)).toFixed(4);

        updateAllHelpers();
        saveAllInputs();
    });

    inputs.pleatCount.addEventListener("input", () => {
        const pleatWidth = calculatePleatWidth(Number(inputs.pleatCount.value), Number(inputs.waist.value));
        inputs.pleatWidth.value = pleatWidth.toFixed(4);
        inputs.pleatUnderlap.value = calculatePleatUnderlap(Number(inputs.pleatWidth.value), Number(inputs.pleatCount.value), Number(inputs.totalMaterial.value)).toFixed(4);

        updateAllHelpers();
        saveAllInputs();
    });

    inputs.totalMaterial.addEventListener("input", () => {
        const pleatWidth = Number(calculatePleatWidth(Number(inputs.pleatCount.value), Number(inputs.waist.value)).toFixed(4));
        inputs.pleatWidth.value = pleatWidth.toFixed(4);
        inputs.pleatUnderlap.value = calculatePleatUnderlap(Number(inputs.pleatWidth.value), Number(inputs.pleatCount.value), Number(inputs.totalMaterial.value)).toFixed(4);

        updateAllHelpers();
        saveAllInputs();
    });

    inputs.pleatUnderlap.addEventListener("input", () => {
        const totalMaterial = calculateTotalMaterial(Number(inputs.pleatWidth.value), Number(inputs.pleatCount.value), Number(inputs.pleatUnderlap.value));
        inputs.totalMaterial.value = totalMaterial.toFixed(2);

        updateAllHelpers();
        saveAllInputs();
    });

    Object.entries(buttons).forEach(([key, { add, minus, decimals }]) => {
        const input = inputs[key as keyof typeof inputs];
        registerStepButtons(input, add, minus, decimals);
    });

    loadAllInputs();
    updateAllHelpers();
});

if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/service-worker.js');
}