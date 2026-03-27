use mongodb::{Database, Collection, bson::{doc, oid::ObjectId, spec::BinarySubtype, Binary, Bson}};
use uuid::Uuid;
use crate::core::anomaly::{Result, AppError};
use crate::modules::identity::context::User;
use crate::modules::contribution::lifecycle::{Contribution, Comment};

fn uuid_as_bson(id: Uuid) -> Bson {
    // UUIDs are currently serialized in this project as generic BSON binary.
    Bson::Binary(Binary {
        subtype: BinarySubtype::Generic,
        bytes: id.as_bytes().to_vec(),
    })
}

/// User Repository - Custom logic for user queries
pub struct UserRepository {
    collection: Collection<User>,
    cred_collection: Collection<UserCredential>,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct UserCredential {
    pub user_id: String,
    pub password_hash: String,
}

impl UserRepository {
    pub fn new(db: &Database) -> Self {
        Self {
            collection: db.collection("users"),
            cred_collection: db.collection("user_credentials"),
        }
    }

    pub async fn find_by_email(&self, email: &str) -> Result<Option<User>> {
        self.collection
            .find_one(doc! { "email": email, "active": true }, None)
            .await
            .map_err(|e| AppError::Internal(e.to_string()))
    }

    pub async fn create(&self, user: User, password_hash: &str) -> Result<User> {
        if !user.email.ends_with(".edu") && !user.email.ends_with(".edu.vn") {
            return Err(AppError::BadRequest(
                "Email phải thuộc miền .edu hoặc .edu.vn".to_string()
            ));
        }

        self.collection.insert_one(&user, None).await
            .map_err(|e| AppError::Internal(e.to_string()))?;

        self.cred_collection.insert_one(
            UserCredential {
                user_id: user.id.to_string(),
                password_hash: password_hash.to_string(),
            },
            None,
        ).await
        .map_err(|e| AppError::Internal(e.to_string()))?;

        Ok(user)
    }

    pub async fn get_password(&self, user_id: Uuid) -> Result<Option<String>> {
        self.cred_collection
            .find_one(doc! { "user_id": user_id.to_string() }, None)
            .await
            .map_err(|e| AppError::Internal(e.to_string()))
            .map(|c| c.map(|cred| cred.password_hash))
    }

    pub async fn accept_terms(&self, email: &str) -> Result<()> {
        self.collection
            .update_one(
                doc! { "email": email },
                doc! { "$set": { "terms_accepted": true } },
                None,
            )
            .await
            .map_err(|e| AppError::Internal(e.to_string()))?;
        Ok(())
    }

    pub async fn find_by_id(&self, id: Uuid) -> Result<Option<User>> {
        self.collection
            .find_one(doc! { "id": uuid_as_bson(id) }, None)
            .await
            .map_err(|e| AppError::Internal(e.to_string()))
    }
}

/// Contribution Repository - Different structure from User
pub struct ContributionRepo {
    collection: Collection<Contribution>,
    vote_collection: Collection<VoteRecord>,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct VoteRecord {
    pub contribution_id: String,
    pub voter_id: String,
    pub vote_type: String,
    pub created_at: chrono::DateTime<chrono::Utc>,
}

impl ContributionRepo {
    pub fn new(db: &Database) -> Self {
        Self {
            collection: db.collection("contributions"),
            vote_collection: db.collection("votes"),
        }
    }

    pub async fn find_by_id(&self, id: Uuid) -> Result<Option<Contribution>> {
        self.collection
            .find_one(doc! { "id": uuid_as_bson(id) }, None)
            .await
            .map_err(|e| AppError::Internal(e.to_string()))
    }

    pub async fn create(&self, contrib: Contribution) -> Result<Contribution> {
        if contrib.is_first_submission && contrib.content.len() > 500 {
            return Err(AppError::BadRequest(
                "Lần đầu gửi ý tưởng: tối đa 500 ký tự".to_string()
            ));
        }

        self.collection.insert_one(&contrib, None).await
            .map_err(|e| AppError::Internal(e.to_string()))?;
        Ok(contrib)
    }

    pub async fn vote(&self, contrib_id: Uuid, voter_id: Uuid, up: bool) -> Result<()> {
        let existing = self.vote_collection
            .find_one(
                doc! { "contribution_id": contrib_id.to_string(), "voter_id": voter_id.to_string() },
                None,
            )
            .await
            .map_err(|e| AppError::Internal(e.to_string()))?;

        if existing.is_some() {
            return Err(AppError::BadRequest("Đã vote rồi".to_string()));
        }

        let field = if up { "up_votes" } else { "down_votes" };
        
        self.collection
            .update_one(
                doc! { "id": uuid_as_bson(contrib_id) },
                doc! { "$inc": { field: 1 } },
                None,
            )
            .await
            .map_err(|e| AppError::Internal(e.to_string()))?;

        self.vote_collection.insert_one(
            VoteRecord {
                contribution_id: contrib_id.to_string(),
                voter_id: voter_id.to_string(),
                vote_type: if up { "up" } else { "down" }.to_string(),
                created_at: chrono::Utc::now(),
            },
            None,
        ).await
        .map_err(|e| AppError::Internal(e.to_string()))?;

        Ok(())
    }

    pub async fn list(&self, limit: i64, skip: i64) -> Result<Vec<Contribution>> {
        let options = mongodb::options::FindOptions::builder()
            .limit(limit)
            .skip(skip as u64)
            .sort(doc! { "created_at": -1 })
            .build();

        let cursor = self.collection
            .find(doc! {}, options)
            .await
            .map_err(|e| AppError::Internal(e.to_string()))?;

        use futures::stream::TryStreamExt;
        cursor.try_collect().await
            .map_err(|e| AppError::Internal(e.to_string()))
    }

    pub async fn update(&self, contrib: Contribution) -> Result<Contribution> {
        self.collection
            .replace_one(doc! { "id": uuid_as_bson(contrib.id) }, &contrib, None)
            .await
            .map_err(|e| AppError::Internal(e.to_string()))?;
        Ok(contrib)
    }
}

/// Comment Repository - Yet different structure
pub struct CommentRepo {
    collection: Collection<Comment>,
}

impl CommentRepo {
    pub fn new(db: &Database) -> Self {
        Self {
            collection: db.collection("comments"),
        }
    }

    pub async fn create(&self, comment: Comment) -> Result<Comment> {
        self.collection.insert_one(&comment, None).await
            .map_err(|e| AppError::Internal(e.to_string()))?;
        Ok(comment)
    }

    pub async fn by_contribution(&self, contrib_id: Uuid) -> Result<Vec<Comment>> {
        let cursor = self.collection
            .find(doc! { "contribution_id": uuid_as_bson(contrib_id) }, None)
            .await
            .map_err(|e| AppError::Internal(e.to_string()))?;

        use futures::stream::TryStreamExt;
        cursor.try_collect().await
            .map_err(|e| AppError::Internal(e.to_string()))
    }
}
