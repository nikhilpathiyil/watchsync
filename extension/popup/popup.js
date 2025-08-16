/**
 * WatchSync Popup Script
 * Handles UI interactions and communication with background script
 */
class WatchSyncPopup {
    constructor() {
        this.currentState = null;
        this.currentTab = null;
        this.elements = this.getElements();
        this.init();
    }
    /**
     * Get all DOM elements
     */
    getElements() {
        return {
            statusDot: document.getElementById('statusDot'),
            statusText: document.getElementById('statusText'),
            detectionIcon: document.getElementById('detectionIcon'),
            detectionTitle: document.getElementById('detectionTitle'),
            detectionSubtitle: document.getElementById('detectionSubtitle'),
            detectionStatus: document.getElementById('detectionStatus'),
            roomSection: document.getElementById('roomSection'),
            activeRoom: document.getElementById('activeRoom'),
            createRoomBtn: document.getElementById('createRoomBtn'),
            joinRoomBtn: document.getElementById('joinRoomBtn'),
            leaveRoomBtn: document.getElementById('leaveRoomBtn'),
            roomIdInput: document.getElementById('roomIdInput'),
            activeRoomId: document.getElementById('activeRoomId'),
            shareRoomId: document.getElementById('shareRoomId'),
            copyRoomBtn: document.getElementById('copyRoomBtn'),
            participantsCount: document.getElementById('participantsCount'),
            debugSection: document.getElementById('debugSection'),
            debugPlatform: document.getElementById('debugPlatform'),
            debugVideoCount: document.getElementById('debugVideoCount'),
            debugUserId: document.getElementById('debugUserId'),
            debugConnection: document.getElementById('debugConnection'),
            debugRoomStatus: document.getElementById('debugRoomStatus'),
            settingsBtn: document.getElementById('settingsBtn'),
            helpBtn: document.getElementById('helpBtn')
        };
    }
    /**
     * Initialize popup
     */
    async init() {
        console.log('🎬 WatchSync: Popup initializing...');
        // Set up event listeners
        this.setupEventListeners();
        // Get current tab
        await this.getCurrentTab();
        // Load extension state
        await this.loadState();
        // Update UI based on current state
        this.updateUI();
        console.log('✅ WatchSync: Popup initialized');
    }
    /**
     * Set up event listeners
     */
    setupEventListeners() {
        // Room management buttons
        this.elements.createRoomBtn.addEventListener('click', () => this.createRoom());
        this.elements.joinRoomBtn.addEventListener('click', () => this.joinRoom());
        this.elements.leaveRoomBtn.addEventListener('click', () => this.leaveRoom());
        this.elements.copyRoomBtn.addEventListener('click', () => this.copyRoomId());
        // Enter key in room input
        this.elements.roomIdInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.joinRoom();
            }
        });
        // Footer buttons
        this.elements.settingsBtn.addEventListener('click', () => this.openSettings());
        this.elements.helpBtn.addEventListener('click', () => this.openHelp());
        console.log('📡 WatchSync: Event listeners set up');
    }
    /**
     * Get current active tab
     */
    async getCurrentTab() {
        return new Promise((resolve) => {
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                this.currentTab = tabs[0] || null;
                console.log('🏷️ WatchSync: Current tab:', this.currentTab?.url);
                resolve();
            });
        });
    }
    /**
     * Load extension state from background script
     */
    async loadState() {
        try {
            // Get state from background script
            const response = await this.sendMessageToBackground({
                type: 'GET_STATE',
                payload: {},
                timestamp: Date.now()
            });
            if (response) {
                this.currentState = response;
                console.log('💾 WatchSync: State loaded:', this.currentState);
            }
            else {
                console.warn('⚠️ WatchSync: No state received from background');
            }
        }
        catch (error) {
            console.error('❌ WatchSync: Failed to load state:', error);
        }
    }
    /**
     * Update UI based on current state
     */
    updateUI() {
        if (!this.currentState) {
            this.showError('Failed to load extension state');
            return;
        }
        // Update status indicator
        this.updateStatusIndicator();
        // Update detection status
        this.updateDetectionStatus();
        // Update room management UI
        this.updateRoomUI();
        // Update debug info if enabled
        if (this.currentState.settings.debugMode) {
            this.updateDebugInfo();
            this.elements.debugSection.style.display = 'block';
        }
    }
    /**
     * Update status indicator
     */
    updateStatusIndicator() {
        const { connectionStatus } = this.currentState;
        this.elements.statusDot.className = 'status-dot';
        if (connectionStatus.connected) {
            this.elements.statusDot.classList.add('connected');
            this.elements.statusText.textContent = 'Connected';
        }
        else {
            this.elements.statusDot.classList.add('disconnected');
            this.elements.statusText.textContent = 'Disconnected';
        }
    }
    /**
     * Update detection status
     */
    updateDetectionStatus() {
        // For Milestone 1, we show a generic detection message
        // This will be updated in later milestones with real video detection info
        this.elements.detectionIcon.textContent = '🔍';
        this.elements.detectionTitle.textContent = 'Video Detection Active';
        this.elements.detectionSubtitle.textContent = 'Monitoring page for video players...';
        // Show room management if we have video detection capability
        this.elements.roomSection.style.display = 'block';
    }
    /**
     * Update room management UI
     */
    updateRoomUI() {
        const { currentRoomId, connectionStatus } = this.currentState;
        if (currentRoomId && connectionStatus.connected) {
            // Show active room
            this.elements.roomSection.style.display = 'none';
            this.elements.activeRoom.style.display = 'block';
            this.elements.activeRoomId.textContent = currentRoomId;
            this.elements.shareRoomId.textContent = currentRoomId;
            this.elements.participantsCount.textContent =
                `${connectionStatus.participantCount} participant${connectionStatus.participantCount !== 1 ? 's' : ''}`;
        }
        else {
            // Show room creation/joining
            this.elements.roomSection.style.display = 'block';
            this.elements.activeRoom.style.display = 'none';
        }
    }
    /**
     * Update debug information
     */
    updateDebugInfo() {
        if (!this.currentState)
            return;
        // Use real video detection data from background script
        const videoData = this.currentState.currentVideo;
        if (videoData) {
            this.elements.debugPlatform.textContent = videoData.platform || "Unknown";
            this.elements.debugVideoCount.textContent = videoData.videoCount?.toString() || "0";
        }
        else {
            this.elements.debugPlatform.textContent = "Unknown";
            this.elements.debugVideoCount.textContent = "0";
        }
        this.elements.debugUserId.textContent = this.currentState.userId;
        this.elements.debugConnection.textContent = this.currentState.connectionStatus.connected
            ? "Connected"
            : "Disconnected";
        
        // Room status
        if (this.currentState.currentRoomId) {
            this.elements.debugRoomStatus.textContent = `In room: ${this.currentState.currentRoomId}`;
        } else {
            this.elements.debugRoomStatus.textContent = "Not in room";
        }
    }
    /**
     * Create a new room
     */
    async createRoom() {
        try {
            this.elements.createRoomBtn.disabled = true;
            this.elements.createRoomBtn.textContent = 'Creating...';
            const roomId = this.generateRoomId();
            const response = await this.sendMessageToBackground({
                type: 'JOIN_ROOM',
                payload: { roomId },
                timestamp: Date.now()
            });
            if (response?.success) {
                console.log('🎯 WatchSync: Room created:', roomId);
                await this.loadState(); // Refresh state
                this.updateUI();
            }
            else {
                throw new Error(response?.error || 'Failed to create room');
            }
        }
        catch (error) {
            console.error('❌ WatchSync: Failed to create room:', error);
            this.showError('Failed to create room');
        }
        finally {
            this.elements.createRoomBtn.disabled = false;
            this.elements.createRoomBtn.innerHTML = '<span class="btn-icon">➕</span>Create Room';
        }
    }
    /**
     * Join an existing room
     */
    async joinRoom() {
        const roomId = this.elements.roomIdInput.value.trim();
        if (!roomId) {
            this.showError('Please enter a room ID');
            return;
        }
        try {
            this.elements.joinRoomBtn.disabled = true;
            this.elements.joinRoomBtn.textContent = 'Joining...';
            const response = await this.sendMessageToBackground({
                type: 'JOIN_ROOM',
                payload: { roomId },
                timestamp: Date.now()
            });
            if (response?.success) {
                console.log('🚪 WatchSync: Joined room:', roomId);
                this.elements.roomIdInput.value = '';
                await this.loadState(); // Refresh state
                this.updateUI();
            }
            else {
                throw new Error(response?.error || 'Failed to join room');
            }
        }
        catch (error) {
            console.error('❌ WatchSync: Failed to join room:', error);
            this.showError('Failed to join room');
        }
        finally {
            this.elements.joinRoomBtn.disabled = false;
            this.elements.joinRoomBtn.innerHTML = '<span class="btn-icon">🚪</span>Join';
        }
    }
    /**
     * Leave current room
     */
    async leaveRoom() {
        try {
            this.elements.leaveRoomBtn.disabled = true;
            this.elements.leaveRoomBtn.textContent = 'Leaving...';
            const response = await this.sendMessageToBackground({
                type: 'LEAVE_ROOM',
                payload: {},
                timestamp: Date.now()
            });
            if (response?.success) {
                console.log('🚪 WatchSync: Left room');
                await this.loadState(); // Refresh state
                this.updateUI();
            }
            else {
                throw new Error(response?.error || 'Failed to leave room');
            }
        }
        catch (error) {
            console.error('❌ WatchSync: Failed to leave room:', error);
            this.showError('Failed to leave room');
        }
        finally {
            this.elements.leaveRoomBtn.disabled = false;
            this.elements.leaveRoomBtn.textContent = 'Leave';
        }
    }
    /**
     * Copy room ID to clipboard
     */
    async copyRoomId() {
        const roomId = this.elements.shareRoomId.textContent;
        if (!roomId)
            return;
        try {
            await navigator.clipboard.writeText(roomId);
            // Show feedback
            const originalText = this.elements.copyRoomBtn.textContent;
            this.elements.copyRoomBtn.textContent = 'Copied!';
            setTimeout(() => {
                this.elements.copyRoomBtn.textContent = originalText;
            }, 1000);
            console.log('📋 WatchSync: Room ID copied to clipboard');
        }
        catch (error) {
            console.error('❌ WatchSync: Failed to copy room ID:', error);
            this.showError('Failed to copy room ID');
        }
    }
    /**
     * Generate a random room ID
     */
    generateRoomId() {
        const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
        let result = '';
        for (let i = 0; i < 8; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    }
    /**
     * Send message to background script
     */
    async sendMessageToBackground(message) {
        return new Promise((resolve, reject) => {
            chrome.runtime.sendMessage(message, (response) => {
                if (chrome.runtime.lastError) {
                    reject(new Error(chrome.runtime.lastError.message));
                }
                else {
                    resolve(response);
                }
            });
        });
    }
    /**
     * Show error message
     */
    showError(message) {
        console.error('❌ WatchSync: Error:', message);
        this.elements.detectionStatus.className = 'detection-status error';
        this.elements.detectionIcon.textContent = '❌';
        this.elements.detectionTitle.textContent = 'Error';
        this.elements.detectionSubtitle.textContent = message;
    }
    /**
     * Open settings (placeholder)
     */
    openSettings() {
        console.log('⚙️ WatchSync: Settings clicked (not implemented yet)');
    }
    /**
     * Open help (placeholder)
     */
    openHelp() {
        console.log('❓ WatchSync: Help clicked (not implemented yet)');
    }
}
// Initialize popup when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('🎬 WatchSync: Popup DOM loaded');
    new WatchSyncPopup();
});
//# sourceMappingURL=popup.js.map