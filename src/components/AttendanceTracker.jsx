// AttendanceTracker.jsx
import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import './AttendanceTracker.css';

// Import ABI
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

function AttendanceTracker() {
  const [provider, setProvider] = useState(null);
  const [contract, setContract] = useState(null);
  const [account, setAccount] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [isRegistered, setIsRegistered] = useState(false);
  const [userName, setUserName] = useState("");
  const [nameInput, setNameInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [attendanceData, setAttendanceData] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [userToModify, setUserToModify] = useState("");
  const [attendanceStatus, setAttendanceStatus] = useState(true);
  const [notification, setNotification] = useState({ show: false, message: "", type: "" });

  // Valid days mapping for display
  const validDaysMap = {
    0: "Sunday",
    4: "Thursday",
    5: "Friday",
    6: "Saturday"
  };

  // Connect to wallet and contract
  useEffect(() => {
    const init = async () => {
      try {
        setLoading(true);
        if (window.ethereum) {
          const providerInstance = new ethers.providers.Web3Provider(window.ethereum);
          
          const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
          const userAccount = accounts[0];

          const contractInstance = new ethers.Contract(
            contractAddress,
            contractABI,
            providerInstance.getSigner()
          );

          const adminAddress = await contractInstance.admin();
          const isAdminAccount = userAccount.toLowerCase() === adminAddress.toLowerCase();

          // Check if user is registered
          try {
            const userData = await contractInstance.users(userAccount);
            const registered = userData[1]; // isRegistered is second return value
            const name = userData[0]; // name is first return value
            
            setIsRegistered(registered);
            if (registered) {
              setUserName(name);
            }
          } catch (err) {
            console.error("Error checking registration:", err);
          }

          setAccount(userAccount);
          setIsAdmin(isAdminAccount);
          setProvider(providerInstance);
          setContract(contractInstance);
          
          // Listen for account changes
          window.ethereum.on('accountsChanged', (accounts) => {
            window.location.reload();
          });
        } else {
          setError("Please install MetaMask to use this application");
        }
      } catch (err) {
        console.error("Initialization error:", err);
        setError("Failed to connect to the blockchain");
      } finally {
        setLoading(false);
      }
    };

    init();
  }, []);

  // Create user profile
  const handleCreateProfile = async () => {
    if (!nameInput.trim()) {
      showNotification("Please enter your name", "error");
      return;
    }

    try {
      setLoading(true);
      const tx = await contract.createProfile(nameInput);
      await tx.wait();
      
      setIsRegistered(true);
      setUserName(nameInput);
      showNotification("Profile created successfully!", "success");
    } catch (err) {
      console.error("Error creating profile:", err);
      showNotification("Failed to create profile", "error");
    } finally {
      setLoading(false);
      setNameInput("");
    }
  };

  // Mark attendance
  const handleMarkAttendance = async () => {
    try {
      setLoading(true);
      const timestamp = Math.floor(selectedDate.getTime() / 1000);
      const tx = await contract.markAttendance(timestamp);
      await tx.wait();
      
      showNotification("Attendance marked successfully!", "success");
    } catch (err) {
      console.error("Error marking attendance:", err);
      showNotification("Failed to mark attendance. Make sure it's a valid class day.", "error");
    } finally {
      setLoading(false);
    }
  };

  // Modify attendance (admin only)
  const handleModifyAttendance = async () => {
    if (!ethers.utils.isAddress(userToModify)) {
      showNotification("Please enter a valid Ethereum address", "error");
      return;
    }

    try {
      setLoading(true);
      const timestamp = Math.floor(selectedDate.getTime() / 1000);
      const tx = await contract.modifyAttendance(userToModify, timestamp, attendanceStatus);
      await tx.wait();
      
      showNotification("Attendance modified successfully!", "success");
    } catch (err) {
      console.error("Error modifying attendance:", err);
      showNotification("Failed to modify attendance", "error");
    } finally {
      setLoading(false);
    }
  };

  // Evict user (admin only)
  const handleEvictUser = async () => {
    if (!ethers.utils.isAddress(userToModify)) {
      showNotification("Please enter a valid Ethereum address", "error");
      return;
    }

    try {
      setLoading(true);
      const tx = await contract.evictUser(userToModify);
      await tx.wait();
      
      showNotification("User evicted successfully!", "success");
    } catch (err) {
      console.error("Error evicting user:", err);
      showNotification("Failed to evict user", "error");
    } finally {
      setLoading(false);
    }
  };

  // Check attendance
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
      console.error("Error checking attendance:", err);
      showNotification("Failed to check attendance", "error");
    } finally {
      setLoading(false);
    }
  };

  // Display notification
  const showNotification = (message, type) => {
    setNotification({ show: true, message, type });
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
      setNotification({ show: false, message: "", type: "" });
    }, 5000);
  };

  // Render component
  return (
    <div className="attendance-tracker">
      <header>
        <h1>Attendance Tracker</h1>
        {account && (
          <div className="account-info">
            <span>Connected: {account.substring(0, 6)}...{account.substring(account.length - 4)}</span>
            {isAdmin && <span className="admin-badge">Admin</span>}
            {isRegistered && <span className="user-badge">{userName}</span>}
          </div>
        )}
      </header>

      {notification.show && (
        <div className={`notification ${notification.type}`}>
          {notification.message}
        </div>
      )}

      {loading ? (
        <div className="loading">Loading...</div>
      ) : error ? (
        <div className="error">{error}</div>
      ) : (
        <div className="content">
          {!isRegistered ? (
            <div className="registration-section">
              <h2>Register for the Course</h2>
              <div className="input-group">
                <input
                  type="text"
                  placeholder="Enter your name"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                />
                <button onClick={handleCreateProfile}>Register</button>
              </div>
            </div>
          ) : (
            <div className="attendance-section">
              <h2>Mark Your Attendance</h2>
              <div className="date-picker">
                <input
                  type="date"
                  value={selectedDate.toISOString().split('T')[0]}
                  onChange={(e) => setSelectedDate(new Date(e.target.value))}
                />
              </div>
              <div className="valid-days">
                <h3>Valid Class Days:</h3>
                <ul>
                  {Object.entries(validDaysMap).map(([key, value]) => (
                    <li key={key}>{value}</li>
                  ))}
                </ul>
              </div>
              <div className="buttons">
                <button onClick={handleMarkAttendance}>Mark Attendance</button>
                <button onClick={handleCheckAttendance}>Check My Attendance</button>
              </div>
            </div>
          )}

          {isAdmin && (
            <div className="admin-section">
              <h2>Admin Controls</h2>
              <div className="input-group">
                <input
                  type="text"
                  placeholder="User Address"
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
                  />
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