'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('users', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      telegram_id: {
        allowNull: false,
        unique: true,
        type: Sequelize.INTEGER,
        field: 'telegram_id'
      },
      username: {
        type: Sequelize.STRING(100),
        allowNull: true
      },
      first_name: {
        type: Sequelize.STRING(100),
        allowNull: true,
        field: 'first_name'
      },
      last_name: {
        type: Sequelize.STRING(100),
        allowNull: true,
        field: 'last_name'
      },
      age: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      gender: {
        type: Sequelize.ENUM('male', 'female', 'other'),
        allowNull: true
      },
      height: {
        type: Sequelize.FLOAT,
        allowNull: true
      },
      weight: {
        type: Sequelize.FLOAT,
        allowNull: true
      },
      activity_level: {
        type: Sequelize.ENUM('low', 'medium', 'high'),
        allowNull: true,
        field: 'activity_level'
      },
      target_weight: {
        type: Sequelize.FLOAT,
        allowNull: true,
        field: 'target_weight'
      },
      target_calories_per_day: {
        type: Sequelize.INTEGER,
        allowNull: true,
        field: 'target_calories_per_day'
      },
      target_protein: {
        type: Sequelize.FLOAT,
        allowNull: true,
        field: 'target_protein'
      },
      target_fat: {
        type: Sequelize.FLOAT,
        allowNull: true,
        field: 'target_fat'
      },
      target_carbs: {
        type: Sequelize.FLOAT,
        allowNull: true,
        field: 'target_carbs'
      },
      current_motivation_level: {
        type: Sequelize.ENUM('low', 'medium', 'high'),
        allowNull: true,
        field: 'current_motivation_level'
      },
      main_goal: {
        type: Sequelize.ENUM('lose_weight', 'gain_muscle', 'maintain', 'health'),
        allowNull: true,
        field: 'main_goal'
      },
      current_diet_method: {
        type: Sequelize.STRING(200),
        allowNull: true,
        field: 'current_diet_method'
      },
      favorite_foods: {
        type: Sequelize.JSON,
        allowNull: true,
        field: 'favorite_foods'
      },
      disliked_foods: {
        type: Sequelize.JSON,
        allowNull: true,
        field: 'disliked_foods'
      },
      motivation_type: {
        type: Sequelize.ENUM('achievement', 'health', 'appearance', 'comfort'),
        allowNull: true,
        field: 'motivation_type'
      },
      setback_patterns: {
        type: Sequelize.JSON,
        allowNull: true,
        field: 'setback_patterns'
      },
      workout_frequency: {
        type: Sequelize.INTEGER,
        allowNull: true,
        field: 'workout_frequency'
      },
      training_method: {
        type: Sequelize.STRING(200),
        allowNull: true,
        field: 'training_method'
      },
      timezone: {
        type: Sequelize.STRING(50),
        defaultValue: 'Europe/Moscow'
      },
      language: {
        type: Sequelize.STRING(10),
        defaultValue: 'ru'
      },
      notifications_enabled: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
        field: 'notifications_enabled'
      },
      state: {
        type: Sequelize.STRING(100),
        allowNull: true
      },
      created_at: {
        allowNull: false,
        type: Sequelize.DATE,
        field: 'created_at'
      },
      updated_at: {
        allowNull: false,
        type: Sequelize.DATE,
        field: 'updated_at'
      }
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('users');
  }
};
