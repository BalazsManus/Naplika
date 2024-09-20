const { contextBridge } = require('electron');

const startPage = "/Assets/index.html";
const instituteFinder = "https://intezmenykereso.e-kreta.hu";
const loginPage = "https://idp.e-kreta.hu/Account/Login";

let localPage = false;

let username, password, currentInstitute;

window.addEventListener('DOMContentLoaded', () => {
    if (window.location.href.endsWith(startPage) && window.location.protocol === 'file:') {
        localPage = true;
    } else {
    }
    if (window.location.href.startsWith(instituteFinder)) {
        const button = document.getElementById('redirectToInstitute');
        button.onclick = saveInstitute;
    }
    if (window.location.href.startsWith(loginPage)) {
        console.log('login')
        const button = document.getElementById('submit-btn');
        button.onclick = interceptLogin;
    }
});

async function saveInstitute() {
    const inputParent = document.getElementById('institute-selector-institute-autocomplete');
    const input = inputParent.querySelector('input[class="dropdown-toggle autocomplete form-control"]');
    let institute = input.value;
    institute = institute.split('(')[1].split(' -')[0];
    const alreadyExists = await checkForInstitute(institute); // Await the result of checkForInstitute
    if (institute.length > 0) {
        if (alreadyExists) {
            return;
        }
        const response = window.confirm(`Szeretnéd menteni a ${institute} nevű iskolát?`);
        if (response) {
            fetch('http://localhost:50019/save', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    key: 'accounts.institutes#',
                    value: institute
                })
            }).then(res => res.json())
                .then(data => {
                    if (data.success) {
                        window.alert('Sikeresen mentve!');
                    }
                })
                .catch(err => {
                    console.error(err);
                });
        }
    }
}
function getAccounts() {
    const accountsDiv = document.getElementById('loginaccounts');
    let instituteList = [];
    fetch('http://localhost:50019/get/accounts.institutes').then(res => res.json())
        .then(data => {
            for (let key in data.value) {
                instituteList.push(key);
            }
            for (let institute of instituteList) {
                const school = `<div><h3>${institute}</h3><ul id="${institute}"></ul></div>`;
                accountsDiv.insertAdjacentHTML('beforeend', school);
                let accounts = [];
                fetch(`http://localhost:50019/get/accounts.institutes.${institute}`).then(res => res.json())
                    .then(data => {
                        for (let key in data.value) {
                            accounts.push(key);
                        }
                        for (let account of accounts) {
                            const accountDiv = document.getElementById(institute);
                            const accountElement = `<li>${account}</li>`;
                            accountDiv.insertAdjacentHTML('beforeend', accountElement);
                        }
                    })
            }
        })
}
function interceptLogin() {
    console.log('intercept')
    const userInput = document.getElementById('UserName');
    const passInput = document.getElementById('Password');
    username = userInput.value;
    password = passInput.value;
    let url = window.location.href;
    url = decodeURIComponent(url);
    url = decodeURIComponent(url);
    currentInstitute = url.split('&redirect_uri=https://')[1].split('.e-kreta.hu')[0];
    const result = window.confirm(`Szeretnéd elmenteni a bejelentkezési adataidat?`);
    if (result) {
        fetch('http://localhost:50019/save', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                key: `accounts.institutes.${currentInstitute}.${username}$`,
                value: password
            })
        })
    }
}

async function checkForInstitute(institute) {
    const instituteList = [];
    const response = await fetch('http://localhost:50019/get/accounts.institutes');
    const data = await response.json();
    for (let key in data.value) {
        instituteList.push(key);
    }
    for (let inst of instituteList) {
        if (inst === institute) {
            console.log('exists');
            return true;
        }
    }
    return false;
}

window.saveInstitute = saveInstitute;
window.interceptLogin = interceptLogin;

contextBridge.exposeInMainWorld('api', {
    getAccounts
})