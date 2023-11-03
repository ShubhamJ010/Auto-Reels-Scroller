const errMsg = document.querySelector("#error") as HTMLParagraphElement;
const toggleBtn = document.querySelector(".toggleBtn") as HTMLButtonElement;

chrome.storage.onChanged.addListener((result) => {
  changeToggleButton(result.applicationIsOn.newValue);
});

chrome.storage.local.get(["applicationIsOn"], (result) => {
  changeToggleButton(result.applicationIsOn);
});

document.onclick = (e: Event) => {
  if ((e.target as HTMLButtonElement).classList.contains("toggleBtn"))
    chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
      if (tabs[0]?.url?.includes("instagram")) {
        chrome.tabs.sendMessage(tabs[0].id, { toggle: true });
      } else errMsg.innerText = "Only works for Instagram Reels";
    });
  if ((e.target as HTMLButtonElement).id === "shortCutBtn") {
    document.querySelector(".shortCut").classList.toggle("remove");
  }
};

function changeToggleButton(result: boolean) {
  if (result) {
    toggleBtn.innerText = "Stop";
    toggleBtn.classList.remove("start");
    toggleBtn.classList.add("stop");
  }
  if (!result) {
    toggleBtn.innerText = "Start";
    toggleBtn.classList.add("start");
    toggleBtn.classList.remove("stop");
  }
}
