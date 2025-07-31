export class UIManager {
  constructor() {
    this.connectBtn = document.getElementById("connectBtn");
    this.muteBtn = document.getElementById("muteBtn");
    this.status = document.getElementById("status");
    this.messagesContent = document.getElementById("messagesContent");
    this.eventsContent = document.getElementById("eventsContent");
    this.toolsContent = document.getElementById("toolsContent");

    this.setupFirefoxWarning();
  }

  clearMessages() {
    this.messagesContent.innerHTML = "";
  }

  setupFirefoxWarning() {
    if (navigator.userAgent.toLowerCase().includes("firefox")) {
      const warning = document.createElement("div");
      warning.style.color = "red";
      warning.style.fontWeight = "bold";
      warning.style.margin = "12px 0";
      warning.textContent =
        "⚠️ Audio input is not supported in Firefox because of the fixed sample rate of mic input. Please use Chrome or Edge.";
      document.body.insertBefore(warning, document.body.firstChild);
    }
  }

  onConnectClick(handler) {
    this.connectBtn.addEventListener("click", handler);
  }

  onMuteClick(handler) {
    this.muteBtn.addEventListener("click", handler);
  }

  updateConnectionState(isConnected) {
    if (isConnected) {
      this.connectBtn.textContent = "Disconnect";
      this.connectBtn.className = "connect-btn connected";
      this.status.textContent = "Connected";
      this.status.className = "status connected";
      this.muteBtn.disabled = false;
    } else {
      this.connectBtn.textContent = "Connect";
      this.connectBtn.className = "connect-btn disconnected";
      this.status.textContent = "Disconnected";
      this.status.className = "status disconnected";
      this.muteBtn.disabled = true;
    }
  }

  updateMuteState(isMuted, isCapturing) {
    if (isMuted) {
      this.muteBtn.textContent = "🔇 Mic Off";
      this.muteBtn.className = "mute-btn muted";
    } else {
      this.muteBtn.textContent = "🎤 Mic On";
      this.muteBtn.className = "mute-btn unmuted";
      if (isCapturing) {
        this.muteBtn.classList.add("active");
      } else {
        this.muteBtn.classList.remove("active");
      }
    }
  }

  addMessage(role, content) {
    const messageDiv = document.createElement("div");
    messageDiv.className = `message ${role}`;

    const bubbleDiv = document.createElement("div");
    bubbleDiv.className = "message-bubble";
    bubbleDiv.textContent = content;

    messageDiv.appendChild(bubbleDiv);
    this.messagesContent.appendChild(messageDiv);
    this.scrollMessagesToBottom();
  }

  addRawEvent(event) {
    const eventDiv = document.createElement("div");
    eventDiv.className = "event";

    const headerDiv = document.createElement("div");
    headerDiv.className = "event-header";
    headerDiv.innerHTML = `
            <span>${event.type}</span>
            <span>▼</span>
        `;

    const contentDiv = document.createElement("div");
    contentDiv.className = "event-content collapsed";
    contentDiv.textContent = JSON.stringify(event, null, 2);

    headerDiv.addEventListener("click", () => {
      const isCollapsed = contentDiv.classList.contains("collapsed");
      contentDiv.classList.toggle("collapsed");
      headerDiv.querySelector("span:last-child").textContent = isCollapsed
        ? "▲"
        : "▼";
    });

    eventDiv.appendChild(headerDiv);
    eventDiv.appendChild(contentDiv);
    this.eventsContent.appendChild(eventDiv);

    this.eventsContent.scrollTop = this.eventsContent.scrollHeight;
  }

  addToolEvent(event) {
    const eventDiv = document.createElement("div");
    eventDiv.className = "event";

    let title = "",
      description = "",
      eventClass = "";

    if (event.type === "handoff") {
      title = `🔄 Handoff`;
      description = `From ${event.from} to ${event.to}`;
      eventClass = "handoff";
    } else if (event.type === "tool_start") {
      title = `🔧 Tool Started`;
      description = `Running ${event.tool}`;
      eventClass = "tool";
    } else if (event.type === "tool_end") {
      title = `✅ Tool Completed`;
      description = `${event.tool}: ${event.output || "No output"}`;
      eventClass = "tool";
    }

    eventDiv.innerHTML = `
            <div class="event-header ${eventClass}">
                <div>
                    <div style="font-weight: 600; margin-bottom: 2px;">${title}</div>
                    <div style="font-size: 0.8rem; opacity: 0.8;">${description}</div>
                </div>
                <span style="font-size: 0.7rem; opacity: 0.6;">${new Date().toLocaleTimeString()}</span>
            </div>
        `;

    this.toolsContent.appendChild(eventDiv);
    this.toolsContent.scrollTop = this.toolsContent.scrollHeight;
  }

  scrollMessagesToBottom() {
    this.messagesContent.scrollTop = this.messagesContent.scrollHeight;
  }
}
