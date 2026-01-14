# Assignment 4 - Working with Databases

## Tasks

### Database connection

Start storing your students data in **PostgreSQL** database. Implement all CRUD operations with PostgreSQL in your Node.js Express project.

You are allowed to use ORM (like **Sequelize**) to make it easier for you to operate with your external database.

#### Useful Links

- [node-postgres](https://node-postgres.com/)
- [Sequelize - ORM](https://sequelize.org/)

### Data Validation

In order to send less incorrect requests directly to your database it is a good idea to protect some of your endpoints with data validation.

Make sure every endpoint that accepts incoming data provided by user is validated. In case if validation is failed - you need to return error message with correct status code.

#### Useful Links

- [Joi](https://joi.dev/api/?v=17.13.3)
- [express-validator](https://express-validator.github.io/docs/)
- [class-validator](https://github.com/typestack/class-validator)

### Database Structure Migration

Make sure that any user can set up a local database simply by running the migration script.

It is expected that this _script_ will create necessary tables in PostgreSQL database so that structure will be compatible with your code logic.

## Evaluation criteria [**Updated**]

- **Core Functionality**
  - **4 pts** - Database is connected and all interactions with it works correctly.
    - **2 pts** - Database is connected with minor issues.
    - **0 pts** - Missing or broken.
- **Data Validation**
  - **2 pts** - Your endpoints are fully protected with data validation where it's necessary.
    - **1 pt** - Not all parts are covered with data validation or configured wrong.
    - **0 pts** - Data validation is missing.
- **Database Structure Migration**
  - **2 pts** - Any user can easily set up database structure on their side and start working with it without problems.
    - **1 pt** - Works but with issues and/or requires additional manual fixes.
    - **0 pts** - Migration is fails or missing.
- **Code Stability & Structure**
  - **2 pts** - Clean, modular, stable and easy to follow.
    - **1 pt** - Acceptable but has inconsistencies.
    - **0 pts** - Disorganized and confusing.

### Penalties

If the submitted code is suspected of being artificially generated and/or copy-pasted, the work will be either returned with **0 pts** or the student will be asked to explain their code in detail. If student fails to explain their code, the practical task is considered as failed and will be returned with **0 pts**.
