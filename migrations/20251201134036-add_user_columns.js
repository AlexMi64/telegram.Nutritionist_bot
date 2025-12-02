'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('users', 'pending_food_description', {
      type: Sequelize.TEXT,
      allowNull: true,
      comment: 'Временное хранение описания еды для уточнения деталей'
    });

    await queryInterface.addColumn('users', 'food_details_timeout', {
      type: Sequelize.DATE,
      allowNull: true,
      comment: 'Время истечения ожидания уточнения еды'
    });

    // Расширение state enum для новых состояний
    await queryInterface.changeColumn('users', 'state', {
      type: Sequelize.ENUM(
        'gender', 'age', 'height', 'weight', 'activity', 'goal', 'budget', 'diet',
        'awaiting_food_details'
      ),
      allowNull: true
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('users', 'pending_food_description');
    await queryInterface.removeColumn('users', 'food_details_timeout');

    await queryInterface.changeColumn('users', 'state', {
      type: Sequelize.ENUM(
        'gender', 'age', 'height', 'weight', 'activity', 'goal', 'budget', 'diet'
      ),
      allowNull: true
    });
  }
};
