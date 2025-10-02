# Tus Consumos

A privacy-first tool to import and review your electricity consumption & production data.

## Project Overview

Tus Consumos is a client-side web application that uses the Datadis APIs to retrieve and display energy usage data for electricity contracts in Spain.

This tool can be used as a companion app to "El Grinch Energetico" Excel spreadsheet to help you find the best energy price option in Spain based on your consumption habits.

Privacy is and should be a first-class citizen in this project. The tool only makes network calls to Datadis servers and GoatCounter, an open-source and GDPR-compliant analytics script used to track page usage.

**Why Datadis?**  Datadis provides a single API to communicate to every energy distributor in Spain.

## Features

- User authentication with Datadis.es credentials (you'll need an account first).
- Retrieval of electricity consumption and production data.
- Visualization of monthly consumption and production pattern.
- Easy export functionality to "El Grinch Energético" Excel spreadsheet.
- Privacy-first approach: none of your consumption data ever leaves your browser; only makes calls to the Datadis API (this is where your consumption data is stored).
- Includes an ad-hoc mock server for development and testing purposes.
- Supports TD2.0 bills only.

## How to use

1. Create a [Datadis account](https://www.datadis.es).
2. Log-in to [Tus Consumos website](https://marcmp.github.io/tus-consumos/) using your Datadis credentials.
3. Download the latest [Grinch Energético excel spreadsheet](https://grinchenergetico.com/comparador-de-tarifas/).
4. Paste your consumption/production data to the spreadsheet to calculate your best electricity bill price.

**Don't know how to use the ElGrinchEnergético Excel spreadsheet?** Then, watch his instructions in video [here](https://grinchenergetico.com/comparador-de-tarifas/).


## Installation (prod-environment or local)

Just copy the strictly necessary files to your http server
	```bash
	index.html
   style.css
	script.js
   apiCalls.js
	```

Please, remember to follow the License rules below.

## Installation (dev-environment)

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/tus-consumos.git
   cd tus-consumos
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Run the server
	```bash
   http-server
   ```

## Mock Server

The project includes a mock server that simulates the Datadis API endpoints for development and testing purposes, allowing frontend development without actual API calls.

### Starting the Mock Server

```bash
npm run mock-server
```

Runs on port 8088 by default and will display available routes and their status.

### Mock Server Configuration

You can test error scenarios by changing response status codes. Simply edit the custom HTTP status for each call in in `mock/server.js` and restart the server.

### Mock Data Structure

The mock server uses JSON files in the `/mock/data` directory:

```text
mock/data/
  ├── nikola-auth/
  │   └── tokens/
  │       └── login.json
  └── api-private/
      └── api/
          ├── get-distributors-with-supplies-v2.json
          ├── get-supplies-v2.json
          ├── get-contract-detail-v2.json
          └── get-consumption-data-v2.json
```

You can modify these JSON files to customize the mock responses according to your testing needs.

## Tests

To run tests:

```bash
npm test
```

## Contributing

We welcome contributions to TusConsumos! Whether it's bug reports, feature suggestions, code improvements, or documentation updates, your help is appreciated.

Please, check out the [CONTRIBUTING.md](CONTRIBUTING.md) file for detailed guidelines.


## License

This project is licensed under the GNU Affero General Public License v3.0 (AGPL-3.0). Users who interact with this software over a network have the right to receive a copy of the 
corresponding source code.

For more information about your rights, see the LICENSE file or visit https://www.gnu.org/licenses/agpl-3.0.en.html

The project is not affiliated with or endorsed by Datadis nor "El Grinch Energético".
