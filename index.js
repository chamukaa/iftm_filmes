//Lara e Fernando - Terceiro Info
//baixar o xampp -> iniciar o Apache e o MySQL
//entrar no http://localhost/phpmyadmin/index.php?route=/import
//novo bancoDados iftm_filmes - utf8mb4_unicode_ci
//importar SQL
//baixar o node -> https://nodejs.org/pt
//abrir a nova pasta no vscode e criar o index.js
//abrir terminal e dar npm init
//depois: npm install express cors serverless-mysql
//extensões -> npm install nodemon
//colocar no package.json, em "scripts": "start": "nodemon index.js"
//dar esse comando sempre que for rodar: npm start
//pesquisar no navegador: http://127.0.0.1:3000/algumaCoisa/id

//partes feitas em aula

//importações para o trabalho
let express = require("express");
let cors = require("cors");
let mysql = require("serverless-mysql");

//configuração da porta do servidor
let porta = 3000;
let app = express();

//lidando com CORS e JSON
app.use(cors());
app.use(express.json());

//configurando o banco de dados
let bancoDados = mysql({
    config: {
        host: "127.0.0.1",
        database: "iftm_filmes",
        user: "root",
        password: ""
    }
});

//rota inicial - verifica se o servidor está ativo
app.get("/", async (req, res) => {
    res.send("Rota inicial");
});

//listar os filmes - página
app.get("/filmes/:pagina", async (req, res) => {
    try {
        let pagina = parseInt(req.params.pagina, 10); // número da página da URL
        let offset = (pagina - 1) * 10; // número fixo de filmes por página
        let paginas = await bancoDados.query( // consulta no banco de dados para pegar os filmes
            `SELECT * FROM filmes ORDER BY nota DESC LIMIT ? OFFSET ?`,
            [10, offset] // ajustado para usar o valor fixo de 10 filmes por página
        );
        res.send(paginas); // resposta da pesquisa
    } catch (error) {
        console.error("Erro ao buscar filmes:", error);
    }
});

//buscar filmes pelo id
app.get("/filme/:id", async (req, res) => {
    let id = req.params.id; // id do filme
    try {
        let filmes = await bancoDados.query(
            `SELECT * FROM filmes WHERE id = ?`,
            [id]
        );
        res.send(filmes);
    } catch (error) {
        console.error("Erro ao buscar filme:", error);
    }
});

//buscar filmes pelo título
app.get("/filmes/busca/:palavra", async (req, res) => {
    let palavra = req.params.palavra; // palavra-chave para busca
    try {
        let pesquisa = await bancoDados.query(
            `SELECT * FROM filmes WHERE filmes.titulo LIKE ?`, 
            [`%${palavra}%`]
        );
        res.send(pesquisa);
    } catch (error) {
        console.error("Erro ao buscar filme:", error);
    }
});

//buscar por gênero
app.get("/generos/:genero", async (req, res) => {
    let genero = req.params.genero; // gênero específico para buscar os filmes
    try {
        let generos = await bancoDados.query(
            `SELECT filmes.titulo 
            FROM ((filmes_generos 
                    INNER JOIN filmes ON filmes.id = filmes_generos.filme_id)
                    INNER JOIN generos ON generos.id = filmes_generos.genero_id)
            WHERE generos.titulo = ?`, 
            [genero]
        );
        res.send(generos);
    } catch (error) {
        console.error("Erro ao buscar filme:", error);
    }
});

//buscar por ator pelo id
app.get("/ator/:id", async (req, res) => {
    let id = req.params.id; // id do ator
    try {
        let atores = await bancoDados.query(
            `SELECT atores.titulo, filmes.titulo 
            FROM ((atores_filmes 
                    INNER JOIN atores ON atores.id = atores_filmes.ator_id) 
                    INNER JOIN filmes ON filmes.id = atores_filmes.filme_id) 
            WHERE atores.id = ?`, 
            [id]
        );
        res.send(atores);
    } catch (error) {
        console.error("Erro ao buscar filme:", error);
    }
});

//buscar ator pelo nome e listar os filmes
app.get("/atores/busca/:palavra", async (req, res) => {
    let palavra = req.params.palavra; // palavra-chave
    try {
        const resultados = await bancoDados.query(
            `SELECT atores.titulo AS ator, filmes.titulo AS filme
             FROM atores_filmes
             INNER JOIN atores ON atores.id = atores_filmes.ator_id
             INNER JOIN filmes ON filmes.id = atores_filmes.filme_id
             WHERE atores.titulo LIKE ?`,
            [`%${palavra}%`]
        );

        //organizando
        let info = {};
        for (const item of resultados) {
            const ator = item.ator;
            const filme = item.filme;

            if (!info[ator]) {
                info[ator] = [];
            }
            info[ator].push(filme);
        }

        //resposta
        const resposta = Object.keys(info).map((ator) => ({
            ator,
            filmes: info[ator],
        }));

        res.json(resposta);
    } catch (error) {
        console.error("Erro ao buscar dados:", error);
    }
});

//adicionar um novo ator ao banco de dados
app.post("/atores", async (req, res) => {
    try {
        let titulo = req.body.titulo; // título do ator
        let ator = await bancoDados.query( // insere no banco de dados
            `INSERT INTO atores (titulo) VALUES ( ? )`, 
            [titulo]
        );
        let atorID = ator.insertId; // id do ator adicionado
        console.log(`ID do ator adicionado: ${atorID}`);
        res.json({ // resultado
            message: "Ator adicionado com sucesso",
            atorID: atorID,
        });
    } catch (error) {
        console.error("Erro ao adicionar ator:", error);
    }
});

//atualiza o nome de um ator existente
app.put("/atores", async (req, res) => {
    try {
        let id = req.body.id; // id do ator
        let titulo = req.body.titulo; // novo nome
        let novo_nome = await bancoDados.query( // atualiza o nome do ator
            `UPDATE atores SET titulo = ? WHERE id = ?`, 
            [titulo, id]
        );
        console.log(`ID do ator atualizado: ${id}`);
        res.json({
            message: "Ator atualizado com sucesso",
            atorID: id,
        });
    } catch (error) {
        console.error("Erro ao atualizar ator:", error);
    }
});

//deletar um ator e suas participações
app.delete("/atores/:id", async (req, res) => {
    try {
        let ator_id = req.params.id; // id do ator para deletar
        let filmes_ator = await bancoDados.query( // apaga participações
            `DELETE FROM atores_filmes WHERE ator_id = ?`, 
            [ator_id]
        );
        // deleta o ator
        let atorRemovido = await bancoDados.query(
            `DELETE FROM atores WHERE id = ?`, 
            [ator_id]
        );
        console.log(`ID do ator removido: ${ator_id}`);
        // resultados
        res.json({
            message: "Ator e participações removidos com sucesso",
            participacoesRemovidas: filmes_ator.affectedRows,
            atorRemovido: atorRemovido.affectedRows,
        });
    } catch (error) {
        console.error("Erro ao remover ator:", error);
    }
});

//adicionar participação de ator em um filme
app.post("/participacoes", async (req, res) => {
    try {
        let ator_id = req.body.ator_id; // id do ator
        let filme_id = req.body.filme_id; // id do filme
        let participacao = await bancoDados.query( // adicionando participação
            `INSERT INTO atores_filmes (ator_id, filme_id) VALUES ( ? , ? )`, 
            [ator_id, filme_id]
        );
        console.log(`ID da tabela utilizada: ${participacao.insertId}`);
        res.json({
            message: "Participação adicionada com sucesso",
            participacaoID: participacao.insertId,
        });
    } catch (error) {
        console.error("Erro ao adicionar participação:", error);
    }
});

//remover participação de um ator em um filme
app.delete("/participacoes", async (req, res) => {
    try {
        let ator_id = req.body.ator_id; // id do ator
        let filme_id = req.body.filme_id; // id do filme
        let participacao = await bancoDados.query( // deletando participação
            `DELETE FROM atores_filmes WHERE ator_id = ? AND filme_id = ?`, 
            [ator_id, filme_id]
        );
        console.log(
            `Participação removida - Ator ID: ${ator_id}, Filme ID: ${filme_id}`
        );
        res.json({
            message: "Participação removida com sucesso",
            rowsAffected: participacao.affectedRows,
        });
    } catch (error) {
        console.error("Erro ao remover participação:", error);
    }
});

//inicialização do servidor
app.listen(porta, () => {
    console.log(`Servidor rodando em http://127.0.0.1:${porta}`);
});