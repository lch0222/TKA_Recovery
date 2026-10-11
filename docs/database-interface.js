const DATABASE_INTERFACES = {
  painAssessment: {
    enabled: false,
    table: "pain_assessments",
    primaryKey: "id",
    endpoint: "/api/pain-assessments",
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    columns: {
      username: {
        source: "username",
        mysqlType: "VARCHAR(64)",
        required: true
      },
      assessment_date: {
        source: "date",
        mysqlType: "DATE",
        required: true
      },
      vas_score: {
        source: "vasScore",
        mysqlType: "TINYINT UNSIGNED",
        required: true,
        min: 0,
        max: 10
      },
      note: {
        source: "note",
        mysqlType: "TEXT",
        required: false
      },
      created_at: {
        source: "createdAt",
        mysqlType: "DATETIME",
        required: true
      }
    }
  },
  motionMeasurement: {
    enabled: false,
    table: "motion_measurements",
    primaryKey: "id",
    endpoint: "/api/motion-measurements",
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    columns: {
      username: {
        source: "username",
        mysqlType: "VARCHAR(64)",
        required: true
      },
      measurement_date: {
        source: "date",
        mysqlType: "DATE",
        required: true
      },
      action_name: {
        source: "actionName",
        mysqlType: "VARCHAR(64)",
        required: false
      },
      baseline_beta: {
        source: "baselineBeta",
        mysqlType: "DECIMAL(6,2)",
        required: true
      },
      current_angle: {
        source: "currentAngle",
        mysqlType: "DECIMAL(6,2)",
        required: true
      },
      max_angle: {
        source: "maxAngle",
        mysqlType: "DECIMAL(6,2)",
        required: true
      },
      sample_count: {
        source: "sampleCount",
        mysqlType: "INT UNSIGNED",
        required: true
      },
      started_at: {
        source: "startedAt",
        mysqlType: "DATETIME",
        required: true
      },
      ended_at: {
        source: "endedAt",
        mysqlType: "DATETIME",
        required: true
      }
    }
  }
};

async function submitPainAssessment(record) {
  const databaseInterface = getDatabaseInterface("painAssessment");

  if (databaseInterface?.enabled) {
    const payload = buildDatabasePayload(record, databaseInterface);
    const response = await fetch(databaseInterface.endpoint, {
      method: databaseInterface.method || "POST",
      headers: databaseInterface.headers || { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`Pain assessment API failed: ${response.status}`);
    }

    return response.json().catch(() => null);
  }

  const savedRecords = JSON.parse(localStorage.getItem("painAssessmentRecords") || "[]");
  savedRecords.push(record);
  localStorage.setItem("painAssessmentRecords", JSON.stringify(savedRecords));
}

async function submitMotionMeasurement(record) {
  const databaseInterface = getDatabaseInterface("motionMeasurement");

  if (databaseInterface?.enabled) {
    const payload = buildDatabasePayload(record, databaseInterface);
    const response = await fetch(databaseInterface.endpoint, {
      method: databaseInterface.method || "POST",
      headers: databaseInterface.headers || { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`Motion measurement API failed: ${response.status}`);
    }

    return response.json().catch(() => null);
  }

  const savedRecords = JSON.parse(localStorage.getItem("motionMeasurementRecords") || "[]");
  savedRecords.push(record);
  localStorage.setItem("motionMeasurementRecords", JSON.stringify(savedRecords));
}

function getDatabaseInterface(interfaceName) {
  return DATABASE_INTERFACES[interfaceName] || null;
}

function buildDatabasePayload(record, databaseInterface) {
  const payload = {};
  const columns = databaseInterface.columns || {};

  Object.entries(columns).forEach(([columnName, columnConfig]) => {
    payload[columnName] = record[columnConfig.source];
  });

  return payload;
}
