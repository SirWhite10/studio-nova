DEFINE TABLE audit_event TYPE NORMAL SCHEMAFULL PERMISSIONS NONE;
DEFINE FIELD actorType ON audit_event TYPE string ASSERT $value IN ['user', 'service', 'node', 'system'];
DEFINE FIELD actorId ON audit_event TYPE string ASSERT string::len($value) > 0;
DEFINE FIELD action ON audit_event TYPE string ASSERT string::len($value) > 0;
DEFINE FIELD targetType ON audit_event TYPE string ASSERT string::len($value) > 0;
DEFINE FIELD targetId ON audit_event TYPE string ASSERT string::len($value) > 0;
DEFINE FIELD studioId ON audit_event TYPE none | record<studio>;
DEFINE FIELD outcome ON audit_event TYPE string ASSERT $value IN ['started', 'succeeded', 'failed', 'denied'];
DEFINE FIELD requestId ON audit_event TYPE none | string;
DEFINE FIELD details ON audit_event TYPE none | object FLEXIBLE;
DEFINE FIELD createdAt ON audit_event TYPE datetime DEFAULT time::now();
DEFINE INDEX audit_event_studio_created_idx ON audit_event FIELDS studioId, createdAt;
DEFINE INDEX audit_event_target_idx ON audit_event FIELDS targetType, targetId, createdAt;
DEFINE INDEX audit_event_request_idx ON audit_event FIELDS requestId;

DEFINE EVENT OVERWRITE audit_event_immutable ON TABLE audit_event
WHEN $event IN ['UPDATE', 'DELETE']
THEN {
  THROW 'audit_event is append-only';
};
