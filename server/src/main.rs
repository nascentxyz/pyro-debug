use actix_web::{web, App, HttpServer, Responder, HttpResponse, get, post};
use serde::{Deserialize, Serialize};
use std::{collections::HashSet, path::PathBuf, sync::Mutex};
use std::collections::VecDeque;
use env_logger::Env;
use tracing::{debug, info};
#[derive(Serialize, Deserialize, Debug)]
struct GraphMessage {
    graph: String,
    timestamp: u64,
}

#[derive(Serialize, Deserialize, Debug, PartialEq, Eq, Hash)]
struct SourceMessage {
    file_number: usize,
    path: PathBuf,
    source: String,
}

#[derive(Serialize, Deserialize, Debug, PartialEq, Eq, Hash)]
struct ArenaMessage {
    arena: String,
}
struct AppState {
    graphs: Mutex<VecDeque<GraphMessage>>,
    /// unique file_number, path, source
    sources: Mutex<HashSet<SourceMessage>>,
    /// most up to date arena
    arena: Mutex<ArenaMessage>,
}

#[post("/addgraph")]
async fn add_graph(data: web::Json<GraphMessage>, state: web::Data<AppState>) -> impl Responder {
    let mut history = state.graphs.lock().unwrap();
    let graph_string = data.into_inner();
    // dbg!(&graph_string);
    history.push_back(graph_string);
    if history.len() > 10_000 {
        history.pop_front(); // Keep the history manageable
    }
    info!("got graph, after add history len: {}", history.len());
    HttpResponse::Ok()
}

#[post("/addsource")]
async fn add_source(data: web::Json<SourceMessage>, state: web::Data<AppState>) -> impl Responder {
    let mut sources = state.sources.lock().unwrap();
    let source_string = data.into_inner();
    // dbg!(&source_string);
    sources.insert(source_string);
    info!("got source, after add sources len: {}", sources.len());
    HttpResponse::Ok()
}

#[post("/updatearena")]
async fn update_arena(data: web::Json<ArenaMessage>, state: web::Data<AppState>) -> impl Responder {
    let mut arena = state.arena.lock().unwrap();
    let arena_string = data.into_inner();
    *arena = arena_string;
    info!("got arena");
    HttpResponse::Ok()
}

#[post("/clear")]
async fn clear(state: web::Data<AppState>) -> impl Responder {
    let mut history = state.graphs.lock().unwrap();
    history.clear();
    let mut sources = state.sources.lock().unwrap();
    sources.clear();
    info!("History and sources cleared");
    HttpResponse::Ok().body("History and sources cleared")
}

#[get("/getgraphs")]
async fn get_graphs(state: web::Data<AppState>) -> impl Responder {
    let graphs = state.graphs.lock().unwrap();
    debug!("get_graphs, graphs len: {}", graphs.len());
    HttpResponse::Ok().json(&*graphs)
}

#[get("/getsources")]
async fn get_sources(state: web::Data<AppState>) -> impl Responder {
    let sources = state.sources.lock().unwrap();
    debug!("get_sources, sources len: {}", sources.len());
    HttpResponse::Ok().json(&*sources)
}

#[get("/getarena")]
async fn get_arena(state: web::Data<AppState>) -> impl Responder {
    debug!("get_arena");
    let arena = state.arena.lock().unwrap();
    // debug!("arena: {:?}", arena);
    HttpResponse::Ok().json(&*arena)
}


#[actix_web::main]
async fn main() -> std::io::Result<()> {
    env_logger::init_from_env(Env::default().default_filter_or("debug"));

    // Create the shared state outside the closure
    let shared_state = web::Data::new(AppState {
        graphs: Mutex::new(VecDeque::new()),
        sources: Mutex::new(HashSet::new()),
        arena: Mutex::new(ArenaMessage { arena: "Empty".to_string() }),
    });

    HttpServer::new(move || {
        App::new()
            .app_data(shared_state.clone()) // Clone the shared state for each worker
            .service(add_graph)
            .service(add_source)
            .service(update_arena)
            .service(get_graphs)
            .service(get_sources)
            .service(get_arena)
            .service(clear)
            .service(actix_files::Files::new("/", "../site/build").index_file("index.html"))
    })
    .bind("127.0.0.1:8545")?
    .run()
    .await
}
