body {
    font-family: sans-serif;
    display: flex;
    justify-content: center;
    align-items: center;
    height: 100vh;
    background-color: #f0f0f0;
}
#chat-container {
    width: 400px;
    height: 600px;
    border: 1px solid #ccc;
    display: flex;
    flex-direction: column;
}
#chat-box {
    flex-grow: 1;
    overflow-y: auto;
    padding: 10px;
    background-color: #fff;
}
#user-input {
    border: 1px solid #ccc;
    padding: 10px;
}
#send-btn {
    background-color: #007bff;
    color: white;
    padding: 10px;
    border: none;
    cursor: pointer;
}
.user-message {
    text-align: right;
    margin: 5px 0;
}
.bot-message {
    text-align: left;
    margin: 5px 0;
    color: #333;
    background-color: #e9e9e9;
    padding: 8px;
    border-radius: 5px;
}
