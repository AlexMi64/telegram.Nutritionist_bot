module.exports = (sequelize, DataTypes) => {
  const FoodNutrient = sequelize.define('FoodNutrient', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    foodDataId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'food_data',
        key: 'id'
      }
    },
    nutrientId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'nutrients',
        key: 'id'
      }
    },
    amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    derivationId: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    min: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true
    },
    max: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true
    },
    units: {
      type: DataTypes.STRING(10),
      allowNull: false,
      defaultValue: 'G'
    }
  }, {
    tableName: 'food_nutrients',
    indexes: [
      {
        fields: ['foodDataId'],
        using: 'BTREE'
      },
      {
        fields: ['nutrientId'],
        using: 'BTREE'
      },
      {
        fields: ['foodDataId', 'nutrientId'],
        unique: true
      }
    ]
  });

  FoodNutrient.associate = (models) => {
    FoodNutrient.belongsTo(models.FoodData, {
      foreignKey: 'foodDataId',
      as: 'foodData'
    });
    FoodNutrient.belongsTo(models.Nutrient, {
      foreignKey: 'nutrientId',
      as: 'nutrient'
    });
  };

  return FoodNutrient;
};
