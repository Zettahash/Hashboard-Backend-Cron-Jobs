
# Zettahash Cron

Welcome to the Zettahash Cron repository. This repository contains a set of scripts that run on a schedule to support backend data operations for Zettahash applications.

## Contents

- **Scheduled Scripts**
  - A collection of scripts designed to automate backend data tasks.

## Testing Cron Triggers using Wrangler

The recommended way of testing Cron Triggers is by using Wrangler. Wrangler allows you to simulate scheduled events and test your cron triggers locally.

### How to Test Cron Triggers

1. **Start Wrangler with the test-scheduled flag:**

   Use the following command to start Wrangler in test mode. This will expose a `/__scheduled` route for testing using HTTP requests.

   ```sh
   npx wrangler dev --test-scheduled
   ```

2. **Simulate Cron Triggers:**

   You can test different cron patterns by sending an HTTP request to the `/__scheduled` route with the appropriate cron query parameter. For example, to simulate a cron trigger that runs every hour, use the following command:

   ```sh
   curl "http://localhost:8787/__scheduled?cron=0+*+*+*+*"
   ```

## Contribution

Contributions to this repository are welcome. Please follow the guidelines below to ensure a smooth contribution process.

1. Fork the repository.
2. Create a new branch (`git checkout -b feature/your-feature-name`).
3. Commit your changes (`git commit -am 'Add new feature'`).
4. Push to the branch (`git push origin feature/your-feature-name`).
5. Create a new Pull Request.

## License

This repository is licensed under the MIT License. See the [LICENSE](LICENSE) file for more information.

## Contact

For any questions or support, please contact the Zettahash team at [support@zettahash.org](mailto:support@zettahash.org).

Thank you for using Zettahash Cron!

---

This README file was last updated on 24 June 2024.
