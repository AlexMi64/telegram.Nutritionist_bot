'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('users', 'pending_analysis', {
      type: Sequelize.TEXT,
      allowNull: true,
      comment: 'Временное хранение анализа еды (JSON) для локального расчета веса'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('users', 'pending_analysis');
  }
};
