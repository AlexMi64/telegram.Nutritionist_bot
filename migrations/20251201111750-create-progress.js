'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('Progresses', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      userId: {
        type: Sequelize.INTEGER
      },
      date: {
        type: Sequelize.DATE
      },
      weight: {
        type: Sequelize.FLOAT
      },
      bodyFatPercentage: {
        type: Sequelize.FLOAT
      },
      muscleMass: {
        type: Sequelize.FLOAT
      },
      chest: {
        type: Sequelize.FLOAT
      },
      waist: {
        type: Sequelize.FLOAT
      },
      hips: {
        type: Sequelize.FLOAT
      },
      totalCalories: {
        type: Sequelize.FLOAT
      },
      totalProtein: {
        type: Sequelize.FLOAT
      },
      totalFat: {
        type: Sequelize.FLOAT
      },
      totalCarbs: {
        type: Sequelize.FLOAT
      },
      workoutsCount: {
        type: Sequelize.INTEGER
      },
      notes: {
        type: Sequelize.STRING
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE
      }
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('Progresses');
  }
};