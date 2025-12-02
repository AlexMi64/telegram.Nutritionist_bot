'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Progress extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  }
  Progress.init({
    userId: DataTypes.INTEGER,
    date: DataTypes.DATE,
    weight: DataTypes.FLOAT,
    bodyFatPercentage: DataTypes.FLOAT,
    muscleMass: DataTypes.FLOAT,
    chest: DataTypes.FLOAT,
    waist: DataTypes.FLOAT,
    hips: DataTypes.FLOAT,
    totalCalories: DataTypes.FLOAT,
    totalProtein: DataTypes.FLOAT,
    totalFat: DataTypes.FLOAT,
    totalCarbs: DataTypes.FLOAT,
    workoutsCount: DataTypes.INTEGER,
    notes: DataTypes.STRING
  }, {
    sequelize,
    modelName: 'Progress',
  });
  return Progress;
};