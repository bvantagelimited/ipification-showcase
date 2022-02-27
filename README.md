# Showcase that demonstrates IPification features and services

## Installation

List packages need to install:

- Nodejs >= 14x
- Redis

## setup project


1. Copy `config/default.json.sample` to `config/default.json` and set `auth_server_url`, `client_id`, `client_secret` to `default.json`. We have many usercases. so please copy client that we provide for each case.
2. From project folder, run `npm install`
3. Start server `npm start`

## open demo on browser

1. If you run on localhost. Find your machine IP address
2. Example your machine IP address is `192.168.1.100`
3. Access `http://192.168.1.100:3000`


## user case description on default.json

1. `pvn_ip`: Client use when click button `IP` on tab `PVN`
2. `pvn_im`: Client use when click button `IM` on tab `PVN`
3. `login_ip`: Client use when click button `IP` on tab `Login`
4. `login_im`: Client use when click button `IM` on tab `Login`
5. `anonymous`: Client use when click button `Anonymous Identity` on tab `Identity`
6. `kyc_phone`: Client use when click button `KYC` on tab `Identity`