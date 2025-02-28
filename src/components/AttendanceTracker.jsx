// AttendanceTracker.jsx
import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import './AttendanceTracker.css';

const contractABI = [
  "function createProfile(string memory _name) public",
  "function markAttendance(uint256 timestamp) public",
  "function checkAttendance(address _user, uint256 timestamp) public view returns (bool)",
  "function modifyAttendance(address _user, uint256 timestamp, bool status) public",
  "function evictUser(address _user) public",
  "function users(address) public view returns (string, bool)",
  "function admin() public view returns (address)",
  "event ProfileCreated(address indexed user, string name)",
  "event AttendanceMarked(address indexed user, uint256 date)",
  "event AttendanceModified(address indexed user, uint256 date, bool status)",
  "event UserEvicted(address indexed user)"
];

const contractAddress = "0x7cc422e70e02Ae48539C3F83B032D318d534B450"; // Replace with your deployed contract address

// Course details for display purposes
const COURSE_DETAILS = {
  startDate: "2025-02-23",
  totalWeeks: 16,
  daysPerWeek: 4,
  validDays: ["Sunday", "Thursday", "Friday", "Saturday"]
};

function AttendanceTracker() {
  const [provider, setProvider] = useState(null);
  const [contract, setContract] = useState(null);
  const [account, setAccount] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [isRegistered, setIsRegistered] = useState(false);
  const [userProfile, setUserProfile] = useState("");
  const [signedIn, setSignedIn] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [emailInput, setEmailInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [userToModify, setUserToModify] = useState("");
  const [attendanceStatus, setAttendanceStatus] = useState(true);
  const [notification, setNotification] = useState({ show: false, message: "", type: "" });

  // On mount, check for a stored account and set up listener for account changes
  useEffect(() => {
    const storedAccount = localStorage.getItem("connectedAccount");
    if (storedAccount) {
      connectWallet();
    }
    if (window.ethereum) {
      window.ethereum.on("accountsChanged", (accounts) => {
        if (accounts.length > 0) {
          setAccount(accounts[0]);
          localStorage.setItem("connectedAccount", accounts[0]);
        } else {
          setAccount("");
          localStorage.removeItem("connectedAccount");
        }
      });
    }
  }, []);

  // Connect wallet and contract, then check registration
  const connectWallet = async () => {
    if (window.ethereum) {
      try {
        setLoading(true);
        const providerInstance = new ethers.providers.Web3Provider(window.ethereum);
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        console.log("Accounts retrieved:", accounts);
        const userAccount = accounts[0];
        setAccount(userAccount);
        localStorage.setItem("connectedAccount", userAccount);
        setProvider(providerInstance);
        
        const contractInstance = new ethers.Contract(contractAddress, contractABI, providerInstance.getSigner());
        setContract(contractInstance);
        
        const adminAddress = await contractInstance.admin();
        console.log("Admin Address:", adminAddress);
        if (userAccount.toLowerCase() === adminAddress.toLowerCase()) {
          setIsAdmin(true);
        }
        
        // Check if user is registered
        try {
          const userData = await contractInstance.users(userAccount);
          console.log("User Data:", userData);
          const registered = userData[1];
          const storedProfile = userData[0];
          setIsRegistered(registered);
          if (registered) setUserProfile(storedProfile);
        } catch (err) {
          console.error("Registration check error:", err);
        }
      } catch (err) {
        console.error("Wallet connection error:", err);
        setError("Failed to connect wallet");
      } finally {
        setLoading(false);
      }
    } else {
      setError("MetaMask not detected. Please install MetaMask.");
    }
  };

  // Notification helper
  const showNotification = (message, type) => {
    setNotification({ show: true, message, type });
    setTimeout(() => {
      setNotification({ show: false, message: "", type: "" });
    }, 5000);
  };

  // Handle registration (combine name and email for on-chain storage)
  const handleCreateProfile = async () => {
    if (!nameInput.trim() || !emailInput.trim()) {
      showNotification("Please enter both your name and email", "error");
      return;
    }
    const profileData = `${nameInput} (${emailInput})`;
    try {
      setLoading(true);
      const tx = await contract.createProfile(profileData);
      await tx.wait();
      setIsRegistered(true);
      setUserProfile(profileData);
      showNotification("Profile created successfully!", "success");
      setSignedIn(true);
    } catch (err) {
      console.error("Profile creation error:", err);
      showNotification("Profile creation failed", "error");
    } finally {
      setLoading(false);
      setNameInput("");
      setEmailInput("");
    }
  };

  // Sign In (for registered users)
  const handleSignIn = () => {
    setSignedIn(true);
    showNotification("Signed in successfully", "success");
  };

  // Mark attendance for a given date
  const handleMarkAttendance = async () => {
    try {
      setLoading(true);
      const timestamp = Math.floor(selectedDate.getTime() / 1000);
      const tx = await contract.markAttendance(timestamp);
      await tx.wait();
      showNotification("Attendance marked!", "success");
    } catch (err) {
      console.error("Attendance error:", err);
      showNotification("Failed to mark attendance", "error");
    } finally {
      setLoading(false);
    }
  };

  // Check attendance for the selected date
  const handleCheckAttendance = async () => {
    try {
      setLoading(true);
      const timestamp = Math.floor(selectedDate.getTime() / 1000);
      const attended = await contract.checkAttendance(account, timestamp);
      showNotification(
        attended ? "You were present on this date!" : "You were absent on this date",
        attended ? "success" : "warning"
      );
    } catch (err) {
      console.error("Check attendance error:", err);
      showNotification("Error checking attendance", "error");
    } finally {
      setLoading(false);
    }
  };

  // Admin: Modify attendance
  const handleModifyAttendance = async () => {
    if (!ethers.utils.isAddress(userToModify)) {
      showNotification("Enter a valid address", "error");
      return;
    }
    try {
      setLoading(true);
      const timestamp = Math.floor(selectedDate.getTime() / 1000);
      const tx = await contract.modifyAttendance(userToModify, timestamp, attendanceStatus);
      await tx.wait();
      showNotification("Attendance modified", "success");
    } catch (err) {
      console.error("Modify attendance error:", err);
      showNotification("Failed to modify attendance", "error");
    } finally {
      setLoading(false);
    }
  };

  // Admin: Evict user
  const handleEvictUser = async () => {
    if (!ethers.utils.isAddress(userToModify)) {
      showNotification("Enter a valid address", "error");
      return;
    }
    try {
      setLoading(true);
      const tx = await contract.evictUser(userToModify);
      await tx.wait();
      showNotification("User evicted", "success");
    } catch (err) {
      console.error("Evict user error:", err);
      showNotification("Failed to evict user", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="attendance-tracker">
      {/* Hero Section with Course Info */}
      <div className="hero-section">
        <h1>Attendance Tracker</h1>
        <p>
          Manage your course attendance on the blockchain. Register with your details,
          sign in, and mark your attendance on valid class days.
        </p>
        <div className="course-info">
          <h3>Course Details</h3>
          <p>Start Date: {COURSE_DETAILS.startDate}</p>
          <p>Total Weeks: {COURSE_DETAILS.totalWeeks}</p>
          <p>Days per Week: {COURSE_DETAILS.daysPerWeek}</p>
          <p>Valid Days: {COURSE_DETAILS.validDays.join(", ")}</p>
        </div>
      </div>

      {/* Header / Wallet Info */}
      <header>
        <div className="account-info">
          {account ? (
            <>
              <span>Wallet: {account.substring(0, 6)}...{account.substring(account.length - 4)}</span>
              {isAdmin && <span className="admin-badge">Admin</span>}
              {isRegistered && <span className="user-badge">{userProfile}</span>}
            </>
          ) : (
            <button className="connect-btn" onClick={connectWallet}>
              Connect Wallet
            </button>
          )}
        </div>
      </header>

      {/* Notifications */}
      {notification.show && (
        <div className={`notification ${notification.type}`}>
          <p>{notification.message}</p>
          <button className="close-btn" onClick={() => setNotification({ show: false, message: "", type: "" })}>
            &times;
          </button>
        </div>
      )}

      {loading && <div className="loading">Loading...</div>}
      {error && <div className="error">{error}</div>}

      {/* Main Content */}
      {account && !loading && !error && (
        <div className="content">
          {/* Registration Section */}
          {!isRegistered && (
            <div className="registration-section">
              <h2>Create Your Profile</h2>
              <p>Fill in your details below to register on the attendance tracker.</p>
              <form className="registration-form" onSubmit={(e) => { e.preventDefault(); handleCreateProfile(); }}>
                <div className="input-group">
                  <label htmlFor="name">Name:</label>
                  <input
                    type="text"
                    id="name"
                    placeholder="Your Name"
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    required
                  />
                </div>
                <div className="input-group">
                  <label htmlFor="email">Email:</label>
                  <input
                    type="email"
                    id="email"
                    placeholder="Your Email"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    required
                  />
                </div>
                <button type="submit">Register</button>
              </form>
            </div>
          )}

          {/* Sign In Section (for registered users not yet signed in) */}
          {isRegistered && !signedIn && (
            <div className="sign-in-section">
              <h2>Sign In</h2>
              <p>Click below to sign in to your attendance tracker account.</p>
              <button onClick={handleSignIn}>Sign In</button>
            </div>
          )}

          {/* Attendance Section (visible after signing in) */}
          {signedIn && (
            <div className="attendance-section">
              <h2>Mark Your Attendance</h2>
              <p>Select a date to mark or check your attendance. (Only valid dates within the course schedule are accepted.)</p>
              <div className="date-picker">
                <input
                  type="date"
                  value={selectedDate.toISOString().split('T')[0]}
                  onChange={(e) => setSelectedDate(new Date(e.target.value))}
                />
              </div>
              <div className="buttons">
                <button onClick={handleMarkAttendance}>Mark Attendance</button>
                <button onClick={handleCheckAttendance}>Check Attendance</button>
              </div>
            </div>
          )}

          {/* Admin Controls */}
          {isAdmin && signedIn && (
            <div className="admin-section">
              <h2>Admin Controls</h2>
              <div className="input-group">
                <label htmlFor="modifyAddress">User Address:</label>
                <input
                  type="text"
                  id="modifyAddress"
                  placeholder="User Ethereum Address"
                  value={userToModify}
                  onChange={(e) => setUserToModify(e.target.value)}
                />
              </div>
              <div className="date-picker">
                <input
                  type="date"
                  value={selectedDate.toISOString().split('T')[0]}
                  onChange={(e) => setSelectedDate(new Date(e.target.value))}
                />
              </div>
              <div className="attendance-toggle">
                <label>
                  <input
                    type="checkbox"
                    checked={attendanceStatus}
                    onChange={(e) => setAttendanceStatus(e.target.checked)}
                  />{" "}
                  Present
                </label>
              </div>
              <div className="buttons">
                <button onClick={handleModifyAttendance}>Modify Attendance</button>
                <button onClick={handleEvictUser} className="danger">Evict User</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default AttendanceTracker;
