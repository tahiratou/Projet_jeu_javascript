const currentPage = window.location.pathname.split('/').pop(); 

if (currentPage === "start.html") {
    $(document).ready(function () {
        $('#bouton').on('click', function () {
            const username = $('#username').val();
            if (username.trim() !== "") {
                window.location.href = `quiz.html?username=${username}`;
            } else {
                alert("Veuillez entrer votre nom avant de continuer.");
            }
        });
    });

} else if (currentPage === "quiz.html") {
    $(document).ready(function () {
        const username = new URLSearchParams(window.location.search).get('username');
        if (username) {
            $('#username').text(username); 
        } else {
            $('#username').text('Utilisateur'); 
        }

        let selectedImages = [];
        let currentIndex = 0;
        let results = {};

        $.ajax({
            url: 'TP02/data.php',
            method: 'GET',
            data: { data: 'categories' },
            dataType: 'json',
            success: function (data) {
                let categories = data.categories;
                if (categories && categories.length > 0) {
                    const container = $('#conteneur-categories');

                    function afficherCategoriesMelangees() {
                        const shuffledCategories = categories.sort(() => Math.random() - 0.5);

                        container.empty();

                        shuffledCategories.forEach(category => {
                            const div = $('<div>').addClass('form-check');
                            const input = $('<input>').addClass('form-check-input')
                                                      .attr('type', 'radio')
                                                      .attr('name', 'category')
                                                      .attr('id', category.toLowerCase())
                                                      .val(category.toLowerCase());

                            const label = $('<label>').addClass('form-check-label fs-5')
                                                      .attr('for', input.attr('id'))
                                                      .text(category);

                            div.append(input).append(label);
                            container.append(div);
                        });
                    }

                    afficherCategoriesMelangees();
                } else {
                    console.error('Aucune catégorie disponible');
                }
            },
            error: function (error) {
                console.error('Erreur de récupération des catégories:', error);
            }
        });

        function afficherImageEtDescriptions(image, propositions) {
            $.ajax({
                url: 'TP02/data.php',
                method: 'GET',
                data: { data: 'response', image: image },
                dataType: 'json',
                success: function (imageData) {
                    const imageUrl = `TP02/data/${imageData.image}`;
                    $('#conteneur-images-quiz').attr('src', imageUrl);
                    const realDescription = imageData.description;
                    const correctCategory = imageData.category;

                    const filteredPropositions = propositions.filter(desc => desc !== realDescription);
                    const shuffledPropositions = [...filteredPropositions].sort(() => Math.random() - 0.5);
                    const randomPropositions = shuffledPropositions.slice(0, 4);
                    const allDescriptions = [realDescription, ...randomPropositions].sort(() => Math.random() - 0.5);

                    const descriptionsContainer = $('#conteneur-descriptions').empty();
                    allDescriptions.forEach((desc, index) => {
                        const div = $('<div>').addClass('form-check');

                        const input = $('<input>').addClass('form-check-input')
                                                  .attr('type', 'radio')
                                                  .attr('name', 'description')
                                                  .attr('id', `desc${index + 1}`)
                                                  .val(desc.toLowerCase());

                        const label = $('<label>').addClass('form-check-label fs-5')
                                                  .attr('for', input.attr('id'))
                                                  .text(desc);

                        div.append(input).append(label);
                        descriptionsContainer.append(div);
                    });

                    $('#conteneur-images-quiz').data({
                        correctCategory: correctCategory,
                        correctDescription: realDescription
                    });
                },
                error: function (error) {
                    console.error('Erreur lors du chargement de l\'image:', error);
                }
            });
        }

        $.when(
            $.ajax({
                url: 'TP02/data.php',
                method: 'GET',
                data: { data: 'images' },
                dataType: 'json'
            }),
            $.ajax({
                url: 'TP02/data.php',
                method: 'GET',
                data: { data: 'propositions' },
                dataType: 'json'
            })
        ).done(function (imagesData, propositionsData) {
            const images = imagesData[0].images;
            const propositions = propositionsData[0].propositions;

            if (!images || images.length === 0 || !propositions || propositions.length === 0) {
                throw new Error("Images ou propositions manquantes.");
            }

            selectedImages = images.sort(() => Math.random() - 0.5).slice(0, 10);
            afficherImageEtDescriptions(selectedImages[currentIndex], propositions);

            $('#btn-suivant').on('click', function () {
                const categorySelected = $('input[name="category"]:checked');
                const descriptionSelected = $('input[name="description"]:checked');

                if (!categorySelected.length) {
                    alert('Veuillez sélectionner une catégorie avant de continuer.');
                    return;
                }

                if (!descriptionSelected.length) {
                    alert('Veuillez sélectionner une description avant de continuer.');
                    return;
                }

                const correctCategory = $('#conteneur-images-quiz').data('correctCategory');
                const correctDescription = $('#conteneur-images-quiz').data('correctDescription');

                const selectedCategory = categorySelected.val().toLowerCase();
                const selectedDescription = descriptionSelected.val().toLowerCase();

                let scoreForQuestion = 0;

                if (selectedCategory === correctCategory.toLowerCase() && selectedDescription === correctDescription.toLowerCase()) {
                    scoreForQuestion = 1;
                } else if (selectedCategory === correctCategory.toLowerCase() || selectedDescription === correctDescription.toLowerCase()) {
                    scoreForQuestion = 0.5;
                }

                results[`question${currentIndex + 1}`] = {
                    score: scoreForQuestion,
                    category: selectedCategory,
                    description: selectedDescription
                };

                currentIndex++;
                if (currentIndex >= selectedImages.length) {
                    localStorage.setItem('quizImages', JSON.stringify(selectedImages));
                    localStorage.setItem('quizResults', JSON.stringify(results));
                    window.location.href = `results.html?username=${username}`;
                } else {
                    afficherImageEtDescriptions(selectedImages[currentIndex], propositions);
                    $('input[name="category"]:checked').prop('checked', false);
                }
            });
        }).fail(function (error) {
            console.error('Erreur lors du traitement des données:', error);
        });
    });

} else if (currentPage === "results.html") {
    $(document).ready(function () {
        const username = new URLSearchParams(window.location.search).get('username');
        if (username) {
            $('#username').text(username); 
        } else {
            $('#username').text('Utilisateur'); 
        }
        const results = JSON.parse(localStorage.getItem('quizResults')) || {};
        const resultsTable = $('#results-table');
        const totalScoreElement = $('#total-score');
        let totalScore = 0;

        for (let i = 1; i <= 10; i++) {
            const result = results[`question${i}`];
            const row = $('<tr>');

            const questionCell = $('<td>')
                .text(`${i}`)
                .addClass('question-number')
                .data('questionIndex', i - 1);
            const scoreCell = $('<td>').text(result.score);

            row.append(questionCell).append(scoreCell);
            resultsTable.append(row);

            totalScore += result.score;
        }

        totalScoreElement.text(`${totalScore}/10`);

        $('.question-number').on('mouseenter', function () {
            const questionIndex = $(this).data('questionIndex'); 
            const selectedImages = JSON.parse(localStorage.getItem('quizImages')) || [];
            const imageName = selectedImages[questionIndex]; 

            if (imageName) {
                $.ajax({
                    url: 'TP02/data.php',
                    method: 'GET',
                    data: { data: 'response', image: imageName },
                    dataType: 'json',
                    success: function (imageDetails) {
                        const correctCategory = imageDetails.category || 'Non disponible';
                        const correctDescription = imageDetails.description || 'Non disponible';
                        const imageUrl = `TP02/data/${imageName}`;

                        $('#image-panneau')
                            .attr('src', imageUrl)
                            .on('error', function () {
                                console.error('Erreur de chargement de l\'image:', imageUrl);
                            })
                            .show();

                        $('#categorie-question').text(`Catégorie correcte : ${correctCategory}`);
                        $('#description-question').text(`Description correcte : ${correctDescription}`);
                        $('#details-question').show();
                    },
                    error: function (error) {
                        console.error('Erreur lors de la récupération des données depuis data.php :', error);
                    }
                });
            } else {
                console.warn(`Aucune donnée trouvée pour l'index ${questionIndex}`);
            }
        });
    });
}







