# Nicer way to browse Exactum timetables

Deployed at: [https://exactumkalenteri.tko-aly.fi/](https://exactumkalenteri.tko-aly.fi/)

## Development
```
npm ci
npm run dev
```

## Docker
```
docker build . -t exactumkalenteri
docker run --rm -it -p 127.0.0.1:3000:80 exactumkalenteri
```
