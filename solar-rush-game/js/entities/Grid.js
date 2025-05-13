/**
 * Grid-Klasse für die Energiespeicherung und -verteilung
 */
class Grid {
    constructor(scene, config) {
        this.scene = scene;
        this.config = config;
        
        // Eigenschaften
        this.currentCapacity = 0;
        this.maxCapacity = config.maxCapacity;
        this.overloadThreshold = config.overloadThreshold;
        this.blackoutThreshold = config.blackoutThreshold;
        this.baseConsumption = config.baseConsumption;
        this.currentConsumption = this.baseConsumption;
        
        // Status
        this.overloaded = false;
        this.blackout = false;
        this.demandSpikeActive = false;
        
        // Gebäude und deren Verbrauch gemäß Spezifikation
        this.buildings = [
            {
                name: 'Krankenhaus',
                consumption: 5,
                interval: 10000, // 10 Sekunden
                lastConsumption: 0,
                failurePoints: 2
            },
            {
                name: 'E-Auto-Ladestation',
                consumption: 3,
                interval: 10000, // 10 Sekunden
                lastConsumption: 0,
                failurePoints: 1
            },
            {
                name: 'Fabrik',
                consumption: 10,
                interval: 15000, // 15 Sekunden
                lastConsumption: 0,
                failurePoints: 1
            }
        ];
        
        // Zähler für Gebäudeausfälle
        this.buildingFailures = 0;
        this.maxFailures = 5; // 5 Ausfälle = Game Over
        
        // Visuelles Grid erstellen
        this.createVisualGrid();
        
        // Verbrauchstimer
        this.consumptionTimer = scene.time.addEvent({
            delay: 1000,
            callback: this.consumeEnergy,
            callbackScope: this,
            loop: true
        });
        
        // Zufällige Verbrauchsspitzen
        this.demandSpikeTimer = scene.time.addEvent({
            delay: 10000,
            callback: this.checkDemandSpike,
            callbackScope: this,
            loop: true
        });
    }
    
    // Visuelles Grid erstellen
    createVisualGrid() {
        const width = 200;
        const height = 30;
        const x = this.scene.cameras.main.width - width - 20;
        const y = 20;
        
        // Hintergrund
        this.background = this.scene.add.rectangle(x, y, width, height, 0x333333).setOrigin(0, 0);
        
        // Füllstandsanzeige
        this.fill = this.scene.add.rectangle(x, y, 0, height, 0x00ff00).setOrigin(0, 0);
        
        // Überladungsgrenze anzeigen
        const overloadX = x + (width * this.overloadThreshold / this.maxCapacity);
        this.overloadLine = this.scene.add.line(0, 0, overloadX, y, overloadX, y + height, 0xff0000).setOrigin(0, 0);
        
        // Statustext
        this.statusText = this.scene.add.text(x + width / 2, y + height + 15, '', {
            fontFamily: 'Arial',
            fontSize: 14,
            color: '#ffffff',
            align: 'center'
        }).setOrigin(0.5, 0);
        
        // Verbrauchstext
        this.consumptionText = this.scene.add.text(x + width / 2, y + height + 35, '', {
            fontFamily: 'Arial',
            fontSize: 12,
            color: '#ffffff',
            align: 'center'
        }).setOrigin(0.5, 0);
        
        this.updateVisualGrid();
    }
    
    // Energie hinzufügen
    addEnergy(amount) {
        this.currentCapacity = Math.min(this.currentCapacity + amount, this.maxCapacity);
        this.checkStatus();
        this.updateVisualGrid();
        return true;
    }
    
    // Energie verbrauchen (pro Tick)
    consumeEnergy() {
        // Basisverbrauch
        this.currentCapacity = Math.max(0, this.currentCapacity - this.currentConsumption);
        
        // Gebäudespezifischer Verbrauch
        const currentTime = this.scene.time.now;
        let totalBuildingConsumption = 0;
        let buildingStatus = [];
        
        this.buildings.forEach(building => {
            // Prüfen, ob es Zeit für den Verbrauch ist
            if (currentTime - building.lastConsumption >= building.interval) {
                // Verbrauch berechnen
                const consumption = this.demandSpikeActive ?
                    building.consumption * this.config.demandSpikeMultiplier :
                    building.consumption;
                
                // Prüfen, ob genug Energie vorhanden ist
                if (this.currentCapacity >= consumption) {
                    // Energie verbrauchen
                    this.currentCapacity -= consumption;
                    building.lastConsumption = currentTime;
                    buildingStatus.push(`${building.name}: OK`);
                } else {
                    // Nicht genug Energie - Gebäudeausfall
                    this.buildingFailures++;
                    buildingStatus.push(`${building.name}: AUSFALL!`);
                    
                    // Warnung anzeigen
                    this.scene.showWarning(`${building.name} hat einen Stromausfall!`);
                    
                    // Prüfen, ob maximale Ausfälle erreicht wurden
                    if (this.buildingFailures >= this.maxFailures) {
                        this.scene.gameOver('Zu viele Gebäudeausfälle! Die Stadt ist im Blackout.');
                    }
                    
                    building.lastConsumption = currentTime;
                }
                
                totalBuildingConsumption += consumption;
            }
        });
        
        // Status aktualisieren
        this.checkStatus();
        this.updateVisualGrid(buildingStatus);
    }
    
    // Status prüfen (Überlastung, Blackout)
    checkStatus() {
        // Überlastung prüfen
        if (this.currentCapacity >= this.overloadThreshold && !this.overloaded) {
            this.overloaded = true;
            this.scene.sound.play('warning', { volume: 0.5 });
            this.scene.showWarning('Netzüberlastung! Reduziere die Energiezufuhr!');
        } else if (this.currentCapacity < this.overloadThreshold && this.overloaded) {
            this.overloaded = false;
        }
        
        // Blackout prüfen
        if (this.currentCapacity >= this.blackoutThreshold && !this.blackout) {
            this.blackout = true;
            this.scene.gameOver('Blackout! Das Netz wurde überlastet.');
        } else if (this.currentCapacity === 0 && !this.blackout) {
            this.blackout = true;
            this.scene.gameOver('Energieausfall! Die Stadt hat keinen Strom mehr.');
        }
    }
    
    // Visuelles Grid aktualisieren
    updateVisualGrid(buildingStatus = []) {
        // Füllstand aktualisieren
        const fillWidth = (this.currentCapacity / this.maxCapacity) * this.background.width;
        this.fill.width = fillWidth;
        
        // Farbe basierend auf Füllstand ändern
        if (this.currentCapacity >= this.overloadThreshold) {
            this.fill.fillColor = 0xff0000; // Rot bei Überlastung
        } else if (this.currentCapacity >= this.overloadThreshold * 0.8) {
            this.fill.fillColor = 0xffff00; // Gelb bei hohem Füllstand
        } else {
            this.fill.fillColor = 0x00ff00; // Grün bei normalem Füllstand
        }
        
        // Statustext aktualisieren
        this.statusText.setText(`Netz: ${Math.round(this.currentCapacity)}/${this.maxCapacity} Einheiten`);
        
        // Verbrauchstext aktualisieren
        let consumptionText = this.demandSpikeActive ?
            `Verbrauch: ${this.currentConsumption.toFixed(1)}/s (Spitze!)` :
            `Verbrauch: ${this.currentConsumption.toFixed(1)}/s`;
            
        // Gebäudestatus hinzufügen, wenn vorhanden
        if (buildingStatus.length > 0) {
            // Nur den letzten Status anzeigen, um Überladung zu vermeiden
            consumptionText += `\n${buildingStatus[buildingStatus.length - 1]}`;
        }
        
        // Ausfallzähler hinzufügen
        consumptionText += `\nAusfälle: ${this.buildingFailures}/${this.maxFailures}`;
        
        this.consumptionText.setText(consumptionText);
        
        if (this.demandSpikeActive || this.buildingFailures > 0) {
            this.consumptionText.setColor('#ff0000');
        } else {
            this.consumptionText.setColor('#ffffff');
        }
    }
    
    // Prüfen auf zufällige Verbrauchsspitze
    checkDemandSpike() {
        if (this.demandSpikeActive) return;
        
        // Zufällige Verbrauchsspitze
        if (Math.random() < this.scene.gameConfig.obstacles.demandSpikeProbability) {
            this.startDemandSpike();
        }
    }
    
    // Verbrauchsspitze starten
    startDemandSpike() {
        this.demandSpikeActive = true;
        this.currentConsumption = this.baseConsumption * this.config.demandSpikeMultiplier;
        
        // Warnung anzeigen
        this.scene.showWarning('Verbrauchsspitze! Der Energiebedarf steigt!');
        this.scene.sound.play('warning', { volume: 0.7 });
        
        // Timer für Ende der Verbrauchsspitze
        this.scene.time.delayedCall(this.scene.gameConfig.obstacles.demandSpikeDuration, () => {
            this.endDemandSpike();
        });
        
        this.updateVisualGrid();
    }
    
    // Verbrauchsspitze beenden
    endDemandSpike() {
        this.demandSpikeActive = false;
        this.currentConsumption = this.baseConsumption;
        this.updateVisualGrid();
    }
    
    // Aufräumen beim Zerstören
    destroy() {
        if (this.consumptionTimer) this.consumptionTimer.remove();
        if (this.demandSpikeTimer) this.demandSpikeTimer.remove();
        if (this.background) this.background.destroy();
        if (this.fill) this.fill.destroy();
        if (this.overloadLine) this.overloadLine.destroy();
        if (this.statusText) this.statusText.destroy();
        if (this.consumptionText) this.consumptionText.destroy();
    }
}